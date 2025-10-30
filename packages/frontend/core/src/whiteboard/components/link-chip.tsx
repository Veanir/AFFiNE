import { useEffect, useMemo, useState } from 'react';

import { Button, Modal } from '@affine/component';
import { LinkIcon } from '@blocksuite/icons/rc';
import { useNavigate } from 'react-router-dom';
import { useService } from '@toeverything/infra';

import { claimLinkSession } from '../../modules/link-session/api';
import { WorkspacesService } from '../../modules/workspace/services/workspaces';

export function WhiteboardLinkChip({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const workspaces = useService(WorkspacesService);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState<boolean>(false);

  const masked = useMemo(() => code.split('').join(' '), [code]);

  const claim = async () => {
    setError(null);
    setStatus('linking');
    try {
      const res = await claimLinkSession(code);
      // Expose linked context immediately to avoid race on the board page
      (window as any).__affine_linked_workspace_id__ = res.workspaceId;
      if (res.docId) (window as any).__affine_linked_doc_id__ = res.docId;

      // Ensure token is written and workspace is opened before navigation
      await workspaces.openWithAccessToken({
        metadata: { id: res.workspaceId, flavour: 'affine-cloud' as any },
        accessToken: res.accessToken,
      });

      // Navigate to the intended canvas right away
      if (res.docId) navigate(`/board/${res.docId}`, { replace: true });

      setStatus('linked');
      setIsLinked(true);
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

  // clear token on unload (best-effort) when linked
  useEffect(() => {
    if (!isLinked) return;
    const onUnload = () => {
      try {
        indexedDB.deleteDatabase('affine-token');
      } catch {}
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [isLinked]);

  return (
    <>
      {isLinked ? (
        <Button
          variant="secondary"
          tooltip="Connected"
          style={{
            height: 28,
            borderRadius: 9999,
            padding: '0 10px',
          }}
          onClick={() => {
            // disconnect: clear token and reload local workspace board
            // best-effort: clear all known tokens by clearing DB
            try { indexedDB.deleteDatabase('affine-token'); } catch {}
            // clear globals
            try {
              delete (window as any).__affine_linked_workspace_id__;
              delete (window as any).__affine_linked_doc_id__;
            } catch {}
            setIsLinked(false);
            // navigate to a fresh board to avoid using cloud doc
            navigate('/board/', { replace: true });
          }}
        >
          Connected
        </Button>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          variant="plain"
          prefix={<LinkIcon />}
          tooltip="Link to workspace"
          style={{
            height: 28,
            borderRadius: 9999,
            padding: '0 10px',
            background: 'var(--affine-background-primary-color)',
            border: '1px solid var(--affine-border-color)',
          }}
        >
          Link
        </Button>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Link Session"
        width={400}
        contentOptions={{ style: { padding: '20px' } }}
      >
        <div style={{ fontSize: 14, marginBottom: 12 }}>
          Enter the 6-digit code from your device
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            value={code}
            onChange={e =>
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            style={{
              flex: 1,
              fontSize: 20,
              padding: '8px 10px',
              border: '1px solid var(--affine-border-color)',
              borderRadius: 8,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 18,
              minWidth: 90,
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {masked.padEnd(11, ' ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={claim}
            disabled={code.length !== 6 || status === 'linking'}
            variant="primary"
          >
            {status === 'linking' ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
        {error ? (
          <div
            style={{
              color: 'var(--affine-error-color)',
              marginTop: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}
      </Modal>
    </>
  );
}


