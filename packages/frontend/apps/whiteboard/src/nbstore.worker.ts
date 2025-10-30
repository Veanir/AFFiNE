import '@affine/core/bootstrap/browser';

import { broadcastChannelStorages } from '@affine/nbstore/broadcast-channel';
import { cloudStorages, configureSocketAuthMethod } from '@affine/nbstore/cloud';
import { idbStorages } from '@affine/nbstore/idb';
import { idbV1Storages } from '@affine/nbstore/idb/v1';
import {
  StoreManagerConsumer,
  type WorkerManagerOps,
} from '@affine/nbstore/worker/consumer';
import { type MessageCommunicapable, OpConsumer } from '@toeverything/infra/op';

const consumer = new StoreManagerConsumer([
  ...idbStorages,
  ...idbV1Storages,
  ...broadcastChannelStorages,
  ...cloudStorages,
]);

// Provide socket auth using EndpointTokenService-backed IDB in the worker context
configureSocketAuthMethod((endpoint, cb) => {
  const dbReq = indexedDB.open('affine-token', 1);
  dbReq.onupgradeneeded = () => {
    const db = dbReq.result;
    if (!db.objectStoreNames.contains('tokens')) {
      db.createObjectStore('tokens', { keyPath: 'endpoint' });
    }
  };
  dbReq.onsuccess = () => {
    const db = dbReq.result;
    const tx = db.transaction('tokens', 'readonly');
    const store = tx.objectStore('tokens');
    const u = new URL(endpoint);
    const httpOrigin =
      (u.protocol === 'ws:' ? 'http:' : u.protocol === 'wss:' ? 'https:' : u.protocol) +
      '//' +
      u.host;
    const getReq = store.get(httpOrigin);
    getReq.onsuccess = () => {
      const rec = getReq.result as any;
      if (rec?.token) {
        cb({ authorization: `Bearer ${rec.token}` });
      } else {
        cb({});
      }
      db.close();
    };
    getReq.onerror = () => {
      cb({});
      db.close();
    };
  };
  dbReq.onerror = () => cb({});
});

if ('onconnect' in globalThis) {
  // if in shared worker
  (globalThis as any).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];
    consumer.bindConsumer(new OpConsumer<WorkerManagerOps>(port));
  };
} else {
  // if in worker
  consumer.bindConsumer(
    new OpConsumer<WorkerManagerOps>(globalThis as MessageCommunicapable)
  );
}
