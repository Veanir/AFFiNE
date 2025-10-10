import { LiveData,Service } from '@toeverything/infra';

export type AppMode = 'regular' | 'whiteboard' | 'auto';

const LS_KEY = 'affine.appMode';

function readQueryMode(): AppMode | null {
  try {
    const url = new URL(window.location.href);
    const m = url.searchParams.get('mode');
    if (m === 'regular' || m === 'whiteboard' || m === 'auto') return m;
    return null;
  } catch {
    return null;
  }
}

function readStoredMode(): AppMode | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'regular' || v === 'whiteboard' || v === 'auto') return v;
    return null;
  } catch {
    return null;
  }
}

export class AppModeService extends Service {
  readonly mode$ = new LiveData<AppMode>('auto');
  readonly resolved$ = new LiveData<boolean>(false);

  initFromUrlAndStorage() {
    const q = readQueryMode();
    if (q) {
      this.mode$.next(q);
      this.resolved$.next(true);
      return;
    }
    const s = readStoredMode();
    if (s) {
      this.mode$.next(s);
    } else {
      this.mode$.next('auto');
    }
    this.resolved$.next(true);
  }

  setPreferredMode(mode: AppMode) {
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch {}
    this.mode$.next(mode);
  }

  getPreferredMode(): AppMode | null {
    return readStoredMode();
  }
}
