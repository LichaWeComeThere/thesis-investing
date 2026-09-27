import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ThesisBoardScreen, type ThesisOpenTarget } from './ThesisBoardScreen';
import { ThesisLibraryScreen, type ThesisLibraryBrowseState } from './ThesisLibraryScreen';

/** Two views of the same saved records, within the existing Theses destination. */
export function ThesesWorkspace({ initialTarget, navigationRequest, ...boardProps }: ComponentProps<typeof ThesisBoardScreen>): JSX.Element {
  const [view, setView] = useState<'workspace' | 'library'>('workspace');
  const [entry, setEntry] = useState<{ target?: ThesisOpenTarget; create?: boolean }>({ target: initialTarget });
  const [libraryRequested, setLibraryRequested] = useState(false);
  const [browseState, setBrowseState] = useState<ThesisLibraryBrowseState>({
    search: '', lifecycle: 'all', sort: 'recently-updated'
  });
  const lastSelected = useRef(initialTarget?.thesisId);
  const rememberSelected = useCallback((thesisId: string) => { lastSelected.current = thesisId; }, []);

  useEffect(() => {
    if (!navigationRequest) return;
    // Sidebar navigation takes precedence over a pending internal view change.
    setLibraryRequested(false);
    if (view === 'library') navigationRequest.onLeave();
  }, [navigationRequest, view]);

  function openWorkspace(target?: ThesisOpenTarget, create = false): void {
    setEntry({ target, create });
    setLibraryRequested(false);
    setView('workspace');
  }

  if (view === 'library') {
    return <ThesisLibraryScreen
      client={boardProps.client}
      browseState={browseState}
      onBrowseStateChange={setBrowseState}
      onOpenThesis={(target) => openWorkspace(target)}
      onCreateThesis={() => openWorkspace(undefined, true)}
      onBackToWorkspace={() => openWorkspace(lastSelected.current ? { thesisId: lastSelected.current } : undefined)}
    />;
  }

  return <ThesisBoardScreen
    {...boardProps}
    initialTarget={entry.target}
    initialCreate={entry.create}
    onSelectedThesisChange={rememberSelected}
    onBrowseLibrary={() => setLibraryRequested(true)}
    navigationRequest={navigationRequest ?? (libraryRequested ? {
      destination: 'Thesis library',
      onStay: () => setLibraryRequested(false),
      onLeave: () => { setLibraryRequested(false); setView('library'); }
    } : undefined)}
  />;
}
