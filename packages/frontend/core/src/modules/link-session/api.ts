export async function initiateLinkSession(workspaceId: string, docId?: string) {
  const res = await fetch('/api/link-session/initiate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, docId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    sessionId: string;
    code: string;
    expiresAt: number;
  };
}

export async function claimLinkSession(code: string) {
  const res = await fetch('/api/link-session/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    linked: true;
    workspaceId: string;
    userId: string;
    sessionId: string;
    accessToken: string;
    docId?: string;
  };
}

export async function getLinkSessionStatus(sessionId: string) {
  const res = await fetch('/api/link-session/status?sessionId=' + encodeURIComponent(sessionId));
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    status: 'pending' | 'claimed' | 'expired' | 'cancelled';
    expiresAt?: number;
  };
}

export async function cancelLinkSession(sessionId: string) {
  const res = await fetch('/api/link-session/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
}


