import { useCallback, useEffect, useState } from 'react';
import { getDiagram, type SavedDiagram } from '@/api/diagrams.api';
import { AuthPage, type AuthPageMode } from '@/features/auth/pages';
import { DiagramGeneratorPage, MyDiagramsPage } from '@/features/diagrams/pages';
import { type AppPath, editorDiagramPath, ROUTES } from './routes';

type RouterProps = {
  isSessionLoading: boolean;
  onAuthenticated: () => Promise<void>;
  onSignOut: () => void;
  user: { email: string; image?: string | null; name: string } | null;
};

type AppRoute = { name: AuthPageMode } | { name: 'diagrams' } | { name: 'editor'; diagramId?: string };

function routeFromPathname(pathname: string): AppRoute {
  if (pathname === ROUTES.AUTH.SIGN_IN) return { name: 'login' };
  if (pathname === ROUTES.AUTH.SIGN_UP) return { name: 'signup' };
  if (pathname === ROUTES.DIAGRAMS || pathname === '/') return { name: 'diagrams' };
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
  const isAuthenticated = user !== null;
  const diagramId = route.name === 'editor' ? route.diagramId : undefined;

  const navigate = useCallback((path: AppPath) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setRoute(routeFromPathname(path));
  }, []);

  useEffect(() => {
    const handleLocationChange = () => setRoute(routeFromPathname(window.location.pathname));
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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
    <DiagramGeneratorPage
      initialDiagramId={openedDiagram?.id}
      initialProject={openedDiagram?.content}
      isSessionLoading={isSessionLoading}
      key={route.diagramId ?? 'new-diagram'}
      onSignIn={() => navigate(ROUTES.AUTH.SIGN_IN)}
      onSignOut={onSignOut}
      user={user}
    />
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
