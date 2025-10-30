import '../../../blocksuite/block-suite-editor';

import { Button } from '@affine/component';
// import { BlockSuiteEditor } from '@affine/core/blocksuite/block-suite-editor';
import { PageDetailEditor } from '@affine/core/components/page-detail-editor';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { AuthService } from '@affine/core/modules/cloud';
import { DocsService } from '@affine/core/modules/doc';
import type { Doc } from '@affine/core/modules/doc/entities/doc';
import type { Editor } from '@affine/core/modules/editor/entities/editor';
import { EditorsService } from '@affine/core/modules/editor/services/editors';
import type { Workspace } from '@affine/core/modules/workspace';
import { WorkspacesService } from '@affine/core/modules/workspace';
import type { Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import { FrameworkScope } from '@toeverything/infra';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AppModeSwitcher } from '../../components/app-mode-switcher';
import { WhiteboardLinkChip } from '../../components/link-chip';
import {
  getOrCreateBoardDoc,
  getOrCreateLocalWhiteboardWorkspace,
} from '../../modules/ephemeral';

export const Component = () => {
  const { boardId = '' } = useParams();
  const workspacesService = useService(WorkspacesService);

  const [page, setPage] = useState<Store | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  // editor will be created inside provider where services are available

  useEffect(() => {
    let disposed = false;
    (async () => {
      // Prefer opening a linked cloud workspace if present (set by link chip after claim)
      const linkedWorkspaceId = (window as any)
        .__affine_linked_workspace_id__ as string | undefined;
      // linkedDocId is passed via the URL; we only use it to choose workspace
      let ws: Workspace;
      if (linkedWorkspaceId) {
        ws = workspacesService.open({
          metadata: { id: linkedWorkspaceId, flavour: 'affine-cloud' as any },
        }).workspace;
      } else {
        ws = await getOrCreateLocalWhiteboardWorkspace(workspacesService);
      }
      let id = boardId;
      if (linkedWorkspaceId) {
        // Cloud: ensure engine is ready, then wait until the doc record arrives and load it
        await ws.engine.doc.waitForDocReady(ws.id);
        const docs = ws.scope.get(DocsService);
        const start = Date.now();
        const timeoutMs = 30000;
        while (Date.now() - start < timeoutMs) {
          const rec = docs.list.doc$(id).value;
          if (rec) break;
          await new Promise(r => setTimeout(r, 500));
        }
        // If we saw the record, wait for the full doc to load into the engine
        if (docs.list.doc$(id).value) {
          await ws.engine.doc.waitForDocLoaded(id);
        }
      } else {
        // Local: create if needed
        // Ensure engine is ready before creating new docs to avoid `Failed to create doc`
        await ws.engine.doc.waitForDocReady(ws.id);
        id = getOrCreateBoardDoc(
          ws.scope.get(DocsService),
          boardId,
          'edgeless' as any
        );
        ws.scope.get(DocsService).open(id).release();
      }
      // open doc to initialize DocScope providers
      const { doc, release } = ws.scope.get(DocsService).open(id);
      // create an editor entity bound to the current framework
      if (!disposed) {
        setWorkspace(ws);
        setDoc(doc);
        setPage(doc.blockSuiteDoc);
      }
      // release when unmounted
      return () => release();
    })().catch(console.error);
    return () => {
      disposed = true;
    };
  }, [boardId, workspacesService]);

  const authService = useService(AuthService);
  const isAuthenticated = useLiveData(
    authService.session.status$.map(s => s === 'authenticated')
  );

  if (!workspace || !doc || !page) {
    return <AppContainer fallback />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <FrameworkScope key={workspace.id} scope={workspace.scope}>
        <FrameworkScope key={`${workspace.id}:${doc.id}`} scope={doc.scope}>
          <div style={{ width: '100%', height: '100%', display: 'flex' }}>
            <EditorContainer key={`${workspace.id}:${doc.id}`} page={page} />
          </div>
        </FrameworkScope>
      </FrameworkScope>
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {!isAuthenticated && (
          <WhiteboardLinkChip workspaceId={workspace.id} />
        )}
        {!isAuthenticated && (
          <Button
            onClick={() =>
              (location.href =
                '/sign-in?redirect_uri=' + encodeURIComponent(location.href))
            }
          >
            Sign in to save
          </Button>
        )}
      </div>
      <AppModeSwitcher />
    </div>
  );
};

function EditorContainer({}: { page: Store }) {
  const editorsService = useService(EditorsService);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    const e = editorsService.createEditor();
    e.setMode('edgeless' as any);
    setEditor(e);
    return () => {
      // let GC collect editor when scope disposed by framework hierarchy
    };
  }, [editorsService]);

  if (!editor) return null;

  return (
    <FrameworkScope scope={editor.scope}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flex: 1 }}>
        <PageDetailEditor
          onLoad={container => editor.bindEditorContainer(container)}
        />
      </div>
    </FrameworkScope>
  );
}
