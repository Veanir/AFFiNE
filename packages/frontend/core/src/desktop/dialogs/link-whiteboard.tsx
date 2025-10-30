import { Button, Modal } from '@affine/component';
import { useEffect, useMemo, useState } from 'react';

import {
  cancelLinkSession,
  getLinkSessionStatus,
  initiateLinkSession,
} from '../../modules/link-session/api';

export function LinkWhiteboardDialog({
  workspaceId,
  docId,
  close,
}: {
  workspaceId: string;
  docId?: string;
  close: () => void;
}) {
  const [session, setSession] = useState<{
    sessionId: string;
    code: string;
    expiresAt: number;
  } | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await initiateLinkSession(workspaceId, docId);
        setSession(s);
        setClaimed(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to start link');
      }
    })();
  }, [workspaceId, docId]);

  useEffect(() => {
    if (!session) return;
    setRemaining(
      Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
    );
    const id = setInterval(() => {
      setRemaining(
        Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
      );
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (!session) return;
      try {
        const s = await getLinkSessionStatus(session.sessionId);
        if (stopped) return;
        if (s.status === 'claimed') {
          setClaimed(true);
        } else if (s.status === 'expired' || s.status === 'cancelled') {
          setSession(null);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        setTimeout(poll, 3000);
      }
    };
    if (session && !claimed) poll();
    return () => {
      stopped = true;
    };
  }, [session, claimed]);

  const maskedPin = useMemo(() => session?.code ?? '', [session]);

  return (
    <Modal
      open
      onOpenChange={() => close()}
      title="Link Whiteboard"
      width={400}
      contentOptions={{ style: { padding: '20px' } }}
    >
      {!session ? (
        <div style={{ marginBottom: 12 }}>Session expired.</div>
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            Enter this code on your whiteboard:
          </div>
          <div
            style={{
              fontSize: 32,
              letterSpacing: 8,
              marginBottom: 12,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }}
          >
            {maskedPin}
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.7,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            Expires in {remaining}s {claimed ? '• Claimed' : ''}
          </div>
        </>
      )}
      {error ? (
        <div
          style={{
            color: 'var(--affine-error-color)',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {session ? (
          <Button
            onClick={async () => {
              if (!session) return;
              await cancelLinkSession(session.sessionId);
              setSession(null);
              close();
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button onClick={close}>Close</Button>
        )}
      </div>
    </Modal>
  );
}


