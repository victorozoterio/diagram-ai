import { useCallback, useEffect, useRef, useState } from 'react';
import { getDiagram, type SavedDiagram } from '@/api/diagrams.api';
import { AuthPage, type AuthPageMode } from '@/features/auth/pages';
import { UnsavedChangesModal } from '@/features/diagrams/components';
import { DiagramGeneratorPage, MyDiagramsPage } from '@/features/diagrams/pages';
import { type AppPath, editorDiagramPath, ROUTES } from './routes';

type RouterProps = {
  isSessionLoading: boolean;
  onAuthenticated: () => Promise<void>;
  onSignOut: () => void;
  user: { email: string; image?: string | null; name: string } | null;
};

type AppRoute = { name: AuthPageMode } | { name: 'diagrams' } | { name: 'editor'; diagramId?: string };
type PendingNavigation = { path: AppPath };

function routeFromPathname(pathname: string): AppRoute {
  if (pathname === ROUTES.AUTH.SIGN_IN) return { name: 'login' };
  if (pathname === ROUTES.AUTH.SIGN_UP) return { name: 'signup' };
  if (pathname === ROUTES.DIAGRAMS || pathname === '/diagramas') return { name: 'diagrams' };
  if (pathname === ROUTES.EDITOR) return { name: 'editor' };

  const editorPrefix = `${ROUTES.EDITOR}/`;
  if (pathname.startsWith(editorPrefix)) {
    const diagramId = decodeURIComponent(pathname.slice(editorPrefix.length));
    return diagramId ? { name: 'editor', diagramId } : { name: 'editor' };
  }

  return { name: 'diagrams' };
}

export function Router({ isSessionLoading, onAuthenticated, onSignOut, user }: RouterProps) {
  const [route, setRoute] = useState<AppRoute>(() => routeFromPathname(window.location.pathname));
  const [openedDiagram, setOpenedDiagram] = useState<SavedDiagram | null>(null);
  const [isOpeningDiagram, setIsOpeningDiagram] = useState(false);
  const [openDiagramError, setOpenDiagramError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const [saveBeforeLeaveError, setSaveBeforeLeaveError] = useState<string | null>(null);
  const isAuthenticated = user !== null;
  const diagramId = route.name === 'editor' ? route.diagramId : undefined;
  const currentPathRef = useRef(window.location.pathname);
  const editorDirtyRef = useRef(false);
  const saveBeforeLeaveRef = useRef<(() => Promise<void>) | null>(null);

  const performNavigation = useCallback((path: AppPath) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    currentPathRef.current = path;
    setRoute(routeFromPathname(path));
  }, []);

  const shouldBlockNavigation = useCallback(
    (path: string) => route.name === 'editor' && editorDirtyRef.current && path !== currentPathRef.current,
    [route.name],
  );

  const navigate = useCallback(
    (path: AppPath) => {
      if (shouldBlockNavigation(path)) {
        setSaveBeforeLeaveError(null);
        setPendingNavigation({ path });
        return;
      }

      performNavigation(path);
    },
    [performNavigation, shouldBlockNavigation],
  );

  useEffect(() => {
    const handleLocationChange = () => {
      const targetPath = window.location.pathname as AppPath;
      if (shouldBlockNavigation(targetPath)) {
        window.history.pushState(null, '', currentPathRef.current);
        setSaveBeforeLeaveError(null);
        setPendingNavigation({ path: targetPath });
        return;
      }

      currentPathRef.current = targetPath;
      setRoute(routeFromPathname(targetPath));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (route.name !== 'editor') {
      setOpenedDiagram(null);
      setOpenDiagramError(null);
      return;
    }

    if (!diagramId || !isAuthenticated) {
      setOpenedDiagram(null);
      setOpenDiagramError(null);
      return;
    }

    let isCurrent = true;
    setIsOpeningDiagram(true);
    setOpenDiagramError(null);
    setOpenedDiagram(null);

    void getDiagram(diagramId)
      .then((diagram) => {
        if (isCurrent) setOpenedDiagram(diagram);
      })
      .catch(() => {
        if (isCurrent) setOpenDiagramError('Não foi possível abrir este diagrama.');
      })
      .finally(() => {
        if (isCurrent) setIsOpeningDiagram(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [diagramId, isAuthenticated, route.name]);

  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated && route.name !== 'login' && route.name !== 'signup') {
      navigate(ROUTES.AUTH.SIGN_IN);
    }
  }, [isAuthenticated, isSessionLoading, navigate, route.name]);

  async function handleAuthenticated() {
    await onAuthenticated();
    navigate(ROUTES.DIAGRAMS);
  }

  function handleDirtyChange(dirty: boolean) {
    editorDirtyRef.current = dirty;
  }

  function handleSaveBeforeLeaveReady(save: (() => Promise<void>) | null) {
    saveBeforeLeaveRef.current = save;
  }

  function continueEditing() {
    setSaveBeforeLeaveError(null);
    setPendingNavigation(null);
  }

  function leaveWithoutSaving() {
    const navigation = pendingNavigation;
    if (!navigation) return;

    setPendingNavigation(null);
    performNavigation(navigation.path);
  }

  async function saveAndLeave() {
    const navigation = pendingNavigation;
    if (!navigation || !saveBeforeLeaveRef.current) return;

    setIsSavingBeforeLeave(true);
    setSaveBeforeLeaveError(null);
    try {
      await saveBeforeLeaveRef.current();
      setPendingNavigation(null);
      performNavigation(navigation.path);
    } catch {
      setSaveBeforeLeaveError('Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setIsSavingBeforeLeave(false);
    }
  }

  if (route.name === 'login' || route.name === 'signup') {
    return <AuthPage mode={route.name} onAuthenticated={handleAuthenticated} onNavigate={navigate} />;
  }

  if (isSessionLoading && !isAuthenticated) return null;

  if (!isAuthenticated) {
    return null;
  }

  if (route.name === 'diagrams') {
    return (
      <MyDiagramsPage
        onNewDiagram={() => navigate(ROUTES.EDITOR)}
        onOpenDiagram={(diagramId) => navigate(editorDiagramPath(diagramId))}
        onSignOut={onSignOut}
        user={user}
      />
    );
  }

  if (route.name !== 'editor') return null;

  if (isOpeningDiagram || (route.diagramId && !openedDiagram && !openDiagramError)) {
    return <EditorStatus message='Abrindo diagrama...' />;
  }
  if (openDiagramError) return <EditorStatus message={openDiagramError} onBack={() => navigate(ROUTES.DIAGRAMS)} />;

  return (
    <>
      <DiagramGeneratorPage
        initialDiagramId={openedDiagram?.id}
        initialDiagramName={openedDiagram?.name}
        initialProject={openedDiagram?.content}
        isSessionLoading={isSessionLoading}
        key={route.diagramId ?? 'new-diagram'}
        onDirtyChange={handleDirtyChange}
        onNavigateToDiagrams={() => navigate(ROUTES.DIAGRAMS)}
        onSaveBeforeLeaveReady={handleSaveBeforeLeaveReady}
        onSignIn={() => navigate(ROUTES.AUTH.SIGN_IN)}
        onSignOut={onSignOut}
        user={user}
      />
      {pendingNavigation && (
        <UnsavedChangesModal
          error={saveBeforeLeaveError}
          isSaving={isSavingBeforeLeave}
          onContinueEditing={continueEditing}
          onDiscard={leaveWithoutSaving}
          onSaveAndLeave={() => void saveAndLeave()}
        />
      )}
    </>
  );
}

function EditorStatus({ message, onBack }: { message: string; onBack?: () => void }) {
  return (
    <main>
      <p>{message}</p>
      {onBack && (
        <button onClick={onBack} type='button'>
          Voltar para meus diagramas
        </button>
      )}
    </main>
  );
}
