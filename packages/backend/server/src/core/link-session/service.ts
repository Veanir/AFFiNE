import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { CryptoHelper, Throttle } from '../../base';
import { CacheRedis } from '../../base/redis/instances';
import { Models, WorkspaceRole, WorkspaceMemberStatus } from '../../models';
import type { CurrentUser } from '../auth';
import type {
  ClaimLinkSessionResponse,
  InitiateLinkSessionResponse,
  LinkSessionRecord,
  LinkSessionStatusResponse,
} from './types';

const TTL_SECONDS = 120;
const KEY_PREFIX = 'link-session:';

@Injectable()
export class LinkSessionService {
  private readonly redis: Redis;

  constructor(
    redis: CacheRedis,
    private readonly crypto: CryptoHelper,
    private readonly models: Models
  ) {
    this.redis = redis;
  }

  private key(sessionId: string) {
    return KEY_PREFIX + sessionId;
  }

  private codeKey(code: string) {
    return KEY_PREFIX + 'code:' + this.crypto.sha256(code).toString('hex');
  }

  private toRecord(json: string | null): LinkSessionRecord | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as LinkSessionRecord;
    } catch {
      return null;
    }
  }

  @Throttle('strict')
  async initiate(
    user: CurrentUser,
    workspaceId: string,
    docId?: string
  ): Promise<InitiateLinkSessionResponse> {
    const sessionId = crypto.randomUUID();
    const code = this.crypto.otp(6);
    const codeSha256 = this.crypto.sha256(code).toString('hex');
    const now = Date.now();
    const record: LinkSessionRecord = {
      sessionId,
      workspaceId,
      creatorUserId: user.id,
      codeSha256,
      status: 'pending',
      createdAt: now,
      expiresAt: now + TTL_SECONDS * 1000,
      docId,
    };

    // store by session id
    await this.redis.set(this.key(sessionId), JSON.stringify(record), 'EX', TTL_SECONDS);
    // store by code hash -> session id (to quickly claim)
    await this.redis.set(this.codeKey(code), sessionId, 'EX', TTL_SECONDS);

    return { sessionId, code, expiresAt: record.expiresAt };
  }

  async status(sessionId: string): Promise<LinkSessionStatusResponse> {
    const record = this.toRecord(await this.redis.get(this.key(sessionId)));
    if (!record) return { status: 'expired' };
    return { status: record.status, expiresAt: record.expiresAt };
  }

  async cancel(sessionId: string): Promise<void> {
    const k = this.key(sessionId);
    const record = this.toRecord(await this.redis.get(k));
    if (!record) return;
    record.status = 'cancelled';
    await this.redis.set(k, JSON.stringify(record), 'EX', Math.max(1, Math.floor((record.expiresAt - Date.now()) / 1000)));
  }

  @Throttle('strict')
  async claim(code: string): Promise<ClaimLinkSessionResponse> {
    const sessionId = await this.redis.get(this.codeKey(code));
    if (!sessionId) {
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }
    const k = this.key(sessionId);
    const record = this.toRecord(await this.redis.get(k));
    if (!record) {
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }
    if (record.status !== 'pending') {
      throw new Error('CODE_ALREADY_USED');
    }

    // single-use claim
    await this.redis.del(this.codeKey(code));

    record.status = 'claimed';
    record.claimedAt = Date.now();
    await this.redis.set(k, JSON.stringify(record), 'EX', Math.max(1, Math.floor((record.expiresAt - Date.now()) / 1000)));

    // Ensure claimer has at least editor access to the workspace by allocating a temporary user
    // We create an anonymous user with limited capabilities
    const anonUser = await this.models.user.create({
      email: `guest+${crypto.randomUUID()}@local`,
      name: 'Whiteboard Guest',
      registered: false,
    });
    await this.models.workspaceUser.set(
      record.workspaceId,
      anonUser.id,
      WorkspaceRole.Collaborator,
      {
        status: WorkspaceMemberStatus.Accepted,
      }
    );

    // Mint access token limited by expiry for the guest user
    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
    const tokenRow = await this.models.accessToken.create({
      userId: anonUser.id,
      name: 'link-session',
      expiresAt,
    });

    return {
      linked: true,
      workspaceId: record.workspaceId,
      userId: anonUser.id,
      sessionId: record.sessionId,
      accessToken: tokenRow.token,
      docId: record.docId,
    };
  }
}


