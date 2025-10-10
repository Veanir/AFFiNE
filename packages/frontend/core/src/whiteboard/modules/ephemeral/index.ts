import type { DocsService } from '@affine/core/modules/doc';
import type {
  Workspace,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { getAFFiNEWorkspaceSchema } from '@affine/core/modules/workspace';
import type { DocMode } from '@blocksuite/affine/model';

const LOCAL_WHITEBOARD_WORKSPACE_NAME = 'whiteboard-local';
const LOCAL_WHITEBOARD_WORKSPACE_ID_KEY = 'affine:whiteboard-local-id';

let inflightLocalWhiteboardWorkspace: Promise<Workspace> | null = null;

function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function safeRemoveLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function generateDefaultWhiteboardTitle(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const min = pad2(now.getMinutes());
  return `Whiteboard ${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export async function getOrCreateLocalWhiteboardWorkspace(
  workspacesService: WorkspacesService
): Promise<Workspace> {
  if (inflightLocalWhiteboardWorkspace) {
    return inflightLocalWhiteboardWorkspace;
  }

  inflightLocalWhiteboardWorkspace = (async () => {
    // 1) Try cached id first
    const cachedId = safeGetLocalStorage(LOCAL_WHITEBOARD_WORKSPACE_ID_KEY);
    if (cachedId) {
      const opened = workspacesService.openByWorkspaceId(cachedId);
      if (opened) {
        return opened.workspace;
      }
      // cached id no longer valid
      safeRemoveLocalStorage(LOCAL_WHITEBOARD_WORKSPACE_ID_KEY);
    }

    // 2) Try to find an existing local workspace by profile name
    const list = workspacesService.list.workspaces$.value;
    for (const meta of list) {
      if (meta.flavour !== 'local') continue;
      try {
        const provider = workspacesService.getWorkspaceFlavourProvider(meta);
        const profile = await provider?.getWorkspaceProfile(meta.id);
        if (profile?.name === LOCAL_WHITEBOARD_WORKSPACE_NAME) {
          safeSetLocalStorage(LOCAL_WHITEBOARD_WORKSPACE_ID_KEY, meta.id);
          return workspacesService.open({ metadata: meta }).workspace;
        }
      } catch {
        // ignore and continue scanning
      }
    }

    // 3) Create a new local workspace once
    const meta = await workspacesService.create('local', async collection => {
      collection.meta.initialize();
      collection.doc
        .getMap('meta')
        .set('name', LOCAL_WHITEBOARD_WORKSPACE_NAME);
      // ensure schema initialized so edgeless works out of the box
      getAFFiNEWorkspaceSchema();
    });
    safeSetLocalStorage(LOCAL_WHITEBOARD_WORKSPACE_ID_KEY, meta.id);
    // notify list to include the new workspace
    workspacesService.list.revalidate();
    return workspacesService.open({ metadata: meta }).workspace;
  })();

  try {
    return await inflightLocalWhiteboardWorkspace;
  } finally {
    inflightLocalWhiteboardWorkspace = null;
  }
}

export function getOrCreateBoardDoc(
  docsService: DocsService,
  boardId: string,
  primaryMode: DocMode = 'edgeless' as DocMode
) {
  const existed = docsService.list.doc$(boardId).value;
  if (existed) {
    return existed.id;
  }
  const record = docsService.createDoc({
    id: boardId,
    primaryMode,
    title: generateDefaultWhiteboardTitle(),
  });
  return record.id;
}
