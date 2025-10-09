import { NotificationCenter } from '@affine/component';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import type { Server } from '@affine/core/modules/cloud';
import { ServersService } from '@affine/core/modules/cloud';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

export const RootWrapper = () => {
  const serversService = useService(ServersService);
  const server = useLiveData(serversService.server$('affine-cloud')) as
    | Server
    | undefined;
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    if (!server || isServerReady) return;
    const ac = new AbortController();
    server
      .waitForConfigRevalidation(ac.signal)
      .then(() => setIsServerReady(true))
      .catch(console.error);
    return () => ac.abort();
  }, [server, isServerReady]);

  if (!server || !isServerReady) {
    return <AppContainer fallback />;
  }

  return (
    <FrameworkScope scope={server.scope}>
      <NotificationCenter />
      <Outlet />
    </FrameworkScope>
  );
};
