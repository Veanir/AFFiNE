import type { WorkspaceMetadata } from './metadata';

export interface WorkspaceOpenOptions {
  metadata: WorkspaceMetadata;
  isSharedMode?: boolean;
  accessToken?: string; // optional ephemeral access token (whiteboard link)
}
