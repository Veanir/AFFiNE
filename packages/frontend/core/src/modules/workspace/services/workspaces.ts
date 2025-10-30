import { Service } from '@toeverything/infra';

import type { WorkspaceMetadata } from '..';
import type { WorkspaceDestroyService } from './destroy';
import type { WorkspaceFactoryService } from './factory';
import type { WorkspaceFlavoursService } from './flavours';
import type { WorkspaceListService } from './list';
import type { WorkspaceProfileService } from './profile';
import type { WorkspaceRepositoryService } from './repo';
import type { WorkspaceTransformService } from './transform';

export class WorkspacesService extends Service {
  get list() {
    return this.listService.list;
  }

  constructor(
    private readonly flavoursService: WorkspaceFlavoursService,
    private readonly listService: WorkspaceListService,
    private readonly profileRepo: WorkspaceProfileService,
    private readonly transform: WorkspaceTransformService,
    private readonly workspaceRepo: WorkspaceRepositoryService,
    private readonly workspaceFactory: WorkspaceFactoryService,
    private readonly destroy: WorkspaceDestroyService
  ) {
    super();
  }

  get deleteWorkspace() {
    return this.destroy.deleteWorkspace;
  }

  get getProfile() {
    return this.profileRepo.getProfile;
  }

  get transformLocalToCloud() {
    return this.transform.transformLocalToCloud;
  }

  get open() {
    return this.workspaceRepo.open;
  }

  get openByWorkspaceId() {
    return this.workspaceRepo.openByWorkspaceId;
  }

  /**
   * Open a workspace with an ephemeral access token. The token will be stored per-endpoint
   * so that REST and websocket calls include it automatically. The token is not persisted beyond session.
   */
  async openWithAccessToken(options: { metadata: WorkspaceMetadata; accessToken: string }) {
    const { metadata, accessToken } = options;
    // Bind the server for the workspace and write the token for that origin
    const provider = this.flavoursService.flavours$.value.find(
      x => x.flavour === metadata.flavour
    );
    if (!provider) throw new Error('Unknown workspace flavour');
    // Determine server base URL from provider
    const server = (provider as any).server?.serverMetadata?.baseUrl;
    if (server) {
      const origin = new URL(server).origin;
      await writeTokenToIdb(origin, accessToken);
    }
    return this.open({ metadata });
  }

  get create() {
    return this.workspaceFactory.create;
  }

  async getWorkspaceBlob(meta: WorkspaceMetadata, blob: string) {
    return await this.flavoursService.flavours$.value
      .find(x => x.flavour === meta.flavour)
      ?.getWorkspaceBlob(meta.id, blob);
  }

  getWorkspaceFlavourProvider(meta: WorkspaceMetadata) {
    return this.flavoursService.flavours$.value.find(
      x => x.flavour === meta.flavour
    );
  }

  getAllWorkspaceProfile() {
    const list = this.listService.list.workspaces$.value;
    const profiles = list.map(meta => this.getProfile(meta));
    return profiles;
  }
}

async function writeTokenToIdb(origin: string, token: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('affine-token', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens', { keyPath: 'endpoint' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('tokens', 'readwrite');
      const store = tx.objectStore('tokens');
      store.put({ endpoint: origin, token });
      tx.oncomplete = () => {
        resolve();
        db.close();
      };
      tx.onerror = () => {
        reject(tx.error as any);
        db.close();
      };
    };
    req.onerror = () => reject(req.error as any);
  });
}
