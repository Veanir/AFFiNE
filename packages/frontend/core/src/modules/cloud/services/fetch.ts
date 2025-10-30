import { DebugLogger } from '@affine/debug';
import { UserFriendlyError } from '@affine/error';
import { fromPromise, Service } from '@toeverything/infra';

import type { ServerService } from './server';

const logger = new DebugLogger('affine:fetch');

export type FetchInit = RequestInit & { timeout?: number };

export class FetchService extends Service {
  constructor(private readonly serverService: ServerService) {
    super();
  }
  rxFetch = (
    input: string,
    init?: RequestInit & {
      // https://github.com/microsoft/TypeScript/issues/54472
      priority?: 'auto' | 'low' | 'high';
    } & {
      traceEvent?: string;
    }
  ) => {
    return fromPromise(signal => {
      return this.fetch(input, { signal, ...init });
    });
  };

  /**
   * fetch with custom custom timeout and error handling.
   */
  fetch = async (input: string, init?: FetchInit): Promise<Response> => {
    logger.debug('fetch', input);
    const externalSignal = init?.signal;
    if (externalSignal?.aborted) {
      throw externalSignal.reason;
    }
    const abortController = new AbortController();
    externalSignal?.addEventListener('abort', reason => {
      abortController.abort(reason);
    });

    const timeout = init?.timeout ?? 15000;
    const timeoutId =
      timeout > 0
        ? setTimeout(() => {
            abortController.abort(new Error('timeout after ' + timeout + 'ms'));
          }, timeout)
        : undefined;

    let res: Response;

    try {
      const url = new URL(
        input,
        this.serverService.server.serverMetadata.baseUrl
      );
      const token = await readTokenFromIdb(url.origin);
      const headers: Record<string, string> = {
        ...((init?.headers as any) ?? {}),
        'x-affine-version': BUILD_CONFIG.appVersion,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      res = await globalThis.fetch(url, {
        ...init,
        signal: abortController.signal,
        headers,
      });
    } catch (err: any) {
      throw new UserFriendlyError({
        status: 504,
        code: 'NETWORK_ERROR',
        type: 'NETWORK_ERROR',
        name: 'NETWORK_ERROR',
        message: `Network error: ${err.message}`,
        stacktrace: err.stack,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      if (res.status === 504) {
        const error = new Error('Gateway Timeout');
        logger.debug('network error', error);
        throw new UserFriendlyError({
          status: 504,
          code: 'NETWORK_ERROR',
          type: 'NETWORK_ERROR',
          name: 'NETWORK_ERROR',
          message: 'Gateway Timeout',
          stacktrace: error.stack,
        });
      } else {
        if (res.headers.get('Content-Type')?.startsWith('application/json')) {
          throw UserFriendlyError.fromAny(await res.json());
        } else {
          throw UserFriendlyError.fromAny(await res.text());
        }
      }
    }

    return res;
  };
}

async function readTokenFromIdb(httpOrigin: string): Promise<string | null> {
  return await new Promise(resolve => {
    const req = indexedDB.open('affine-token', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens', { keyPath: 'endpoint' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('tokens', 'readonly');
      const store = tx.objectStore('tokens');
      const getReq = store.get(httpOrigin);
      getReq.onsuccess = () => {
        const rec = getReq.result as any;
        resolve(rec?.token ?? null);
        db.close();
      };
      getReq.onerror = () => {
        resolve(null);
        db.close();
      };
    };
    req.onerror = () => resolve(null);
  });
}
