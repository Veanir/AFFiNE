import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

import { type AppMode,AppModeService } from '../../modules/app-mode/service';

export function useAppMode(): {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  isResolved: boolean;
} {
  const svc = useService(AppModeService);
  const mode = useLiveData(svc.mode$);
  const isResolved = useLiveData(svc.resolved$);

  useEffect(() => {
    if (!isResolved) svc.initFromUrlAndStorage();
  }, [isResolved, svc]);

  return {
    mode,
    isResolved,
    setMode: m => svc.setPreferredMode(m),
  };
}
