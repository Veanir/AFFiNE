export interface LinkSessionRecord {
  sessionId: string;
  workspaceId: string;
  creatorUserId: string;
  codeSha256: string;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  claimedAt?: number;
  docId?: string;
}

export interface InitiateLinkSessionResponse {
  sessionId: string;
  code: string;
  expiresAt: number;
}

export interface LinkSessionStatusResponse {
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expiresAt?: number;
}

export interface ClaimLinkSessionResponse {
  linked: true;
  workspaceId: string;
  userId: string;
  sessionId: string;
  accessToken: string;
  docId?: string;
}


