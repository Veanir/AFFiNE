import { Button } from '@affine/component';
import { AppModeService } from '@affine/core/modules/app-mode/service';
import { useService } from '@toeverything/infra';

export function AppModeSwitcher() {
  const appMode = useService(AppModeService);
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        top: 16,
        zIndex: 10,
        display: 'flex',
        gap: 8,
      }}
    >
      <Button
        onClick={() => {
          appMode.setPreferredMode('regular');
          location.href = '/';
        }}
      >
        Switch to Regular
      </Button>
    </div>
  );
}
