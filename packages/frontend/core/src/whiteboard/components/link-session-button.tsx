import { useEffect, useMemo, useState } from 'react';

import { Button } from '@affine/component';

import { claimLinkSession } from '../../modules/link-session/api';
import { WorkspacesService } from '../../modules/workspace/services/workspaces';

export function LinkSessionButton() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);

  const masked = useMemo(
    () => code.padEnd(6, '•').split('').join(' '),
    [code]
  );

  const claim = async () => {
    setError(null);
    setStatus('linking');
    try {
      const res = await claimLinkSession(code);
      const workspaces = (window as any).__affine_framework__?.get?.(
        WorkspacesService
      ) as WorkspacesService | undefined;
      if (workspaces) {
        await workspaces.openWithAccessToken({
          metadata: { id: res.workspaceId, flavour: 'affine-cloud' as any },
          accessToken: res.accessToken,
        });
      }
      setStatus('linked');
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to link');
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      void claim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="primary">
        Link Session
      </Button>
      {open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              Enter 6‑digit code
            </div>
            <div
              style={{
                fontSize: 28,
                letterSpacing: 6,
                textAlign: 'center',
                marginBottom: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {masked}
            </div>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••••"
              value={code}
              onChange={e =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              style={{
                opacity: 0,
                width: 0,
                height: 0,
                position: 'absolute',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button
                onClick={claim}
                disabled={code.length !== 6 || status === 'linking'}
                type="primary"
              >
                Connect
              </Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </div>
            {error ? (
              <div style={{ color: 'red', marginTop: 8 }}>{error}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}


