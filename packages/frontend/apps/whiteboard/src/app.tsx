import { AppModeOnboarding } from '@affine/core/components/app-mode/onboarding';
import { AffineContext } from '@affine/core/components/context';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { router as desktopRouter } from '@affine/core/desktop/router';
import { configureCommonModules } from '@affine/core/modules';
import { configureAppModeModule } from '@affine/core/modules/app-mode';
import { AppModeService } from '@affine/core/modules/app-mode/service';
import { I18nProvider } from '@affine/core/modules/i18n';
import {
  configureLocalStorageStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import { configureBrowserWorkbenchModule } from '@affine/core/modules/workbench';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import createEmotionCache from '@affine/core/utils/create-emotion-cache';
import { router as whiteboardRouter } from '@affine/core/whiteboard/router';
import { getWorkerUrl } from '@affine/env/worker';
import { StoreManagerClient } from '@affine/nbstore/worker/client';
import { CacheProvider } from '@emotion/react';
import {
  Framework,
  FrameworkRoot,
  getCurrentStore,
  useLiveData,
} from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { Suspense } from 'react';
import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';

const cache = createEmotionCache();

let storeManagerClient: StoreManagerClient;

const workerUrl = getWorkerUrl('nbstore');

if (
  window.SharedWorker &&
  localStorage.getItem('disableSharedWorker') !== 'true'
) {
  const worker = new SharedWorker(workerUrl, {
    name: 'affine-whiteboard-shared-worker',
  });
  storeManagerClient = new StoreManagerClient(new OpClient(worker.port));
} else {
  const worker = new Worker(workerUrl);
  storeManagerClient = new StoreManagerClient(new OpClient(worker));
}

window.addEventListener('beforeunload', () => {
  storeManagerClient.dispose();
});
window.addEventListener('focus', () => {
  storeManagerClient.resume();
});
window.addEventListener('click', () => {
  storeManagerClient.resume();
});
window.addEventListener('blur', () => {
  storeManagerClient.pause();
});

const framework = new Framework();
configureCommonModules(framework);
configureAppModeModule(framework);
configureBrowserWorkbenchModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
framework.impl(NbstoreProvider, {
  openStore(key, options) {
    return storeManagerClient.open(key, options);
  },
});

const frameworkProvider = framework.provider();

const future = { v7_startTransition: true } as const;

export function App() {
  const appModeService = frameworkProvider.get(AppModeService);
  const mode = useLiveData(appModeService.mode$);
  const resolved = useLiveData(appModeService.resolved$);

  useEffect(() => {
    if (!resolved) appModeService.initFromUrlAndStorage();
  }, [resolved, appModeService]);

  const selectedRouter = useMemo(() => {
    if (mode === 'whiteboard') return whiteboardRouter;
    return desktopRouter;
  }, [mode]);

  const showOnboarding = useMemo(
    () => !appModeService.getPreferredMode() && mode === 'auto',
    [appModeService, mode]
  );

  return (
    <Suspense>
      <FrameworkRoot framework={frameworkProvider}>
        <CacheProvider value={cache}>
          <I18nProvider>
            <AffineContext store={getCurrentStore()}>
              {showOnboarding ? (
                <AppModeOnboarding />
              ) : (
                <RouterProvider
                  fallbackElement={<AppContainer fallback />}
                  router={selectedRouter}
                  future={future}
                />
              )}
            </AffineContext>
          </I18nProvider>
        </CacheProvider>
      </FrameworkRoot>
    </Suspense>
  );
}
