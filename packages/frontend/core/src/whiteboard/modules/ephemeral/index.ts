import type { DocsService } from '@affine/core/modules/doc';
import type {
  Workspace,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { getAFFiNEWorkspaceSchema } from '@affine/core/modules/workspace';
import type { DocMode } from '@blocksuite/affine/model';

const LOCAL_WHITEBOARD_WORKSPACE_NAME = 'whiteboard-local';

export async function getOrCreateLocalWhiteboardWorkspace(
  workspacesService: WorkspacesService
): Promise<Workspace> {
  const list = workspacesService.list.workspaces$.value;
  const existing = list.find(
    w => w.flavour === 'local' && w.name === LOCAL_WHITEBOARD_WORKSPACE_NAME
  );
  if (existing) {
    return workspacesService.open({ metadata: existing }).workspace;
  }

  const meta = await workspacesService.create('local', async collection => {
    collection.meta.initialize();
    collection.doc.getMap('meta').set('name', LOCAL_WHITEBOARD_WORKSPACE_NAME);
    // ensure schema initialized so edgeless works out of the box
    getAFFiNEWorkspaceSchema();
  });
  return workspacesService.open({ metadata: meta }).workspace;
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
  const record = docsService.createDoc({ id: boardId, primaryMode });
  return record.id;
}
