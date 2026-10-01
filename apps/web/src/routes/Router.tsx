import { useEffect, useState } from 'react';
import { AuthPage, type AuthPageMode } from '@/features/auth/pages';
import { DiagramGeneratorPage } from '@/features/diagrams/pages';
import { type AppPath, ROUTES } from './routes';

type RouterProps = {
  isSessionLoading: boolean;
  onAuthenticated: () => Promise<void>;
  onSignOut: () => void;
  user: { email: string; image?: string | null; name: string } | null;
};

type AppRoute = 'editor' | AuthPageMode;

function routeFromPathname(pathname: string): AppRoute {
  if (pathname === ROUTES.AUTH.SIGN_IN) return 'login';
  if (pathname === ROUTES.AUTH.SIGN_UP) return 'signup';
  return 'editor';
}

export function Router({ isSessionLoading, onAuthenticated, onSignOut, user }: RouterProps) {
  const [route, setRoute] = useState<AppRoute>(() => routeFromPathname(window.location.pathname));

  useEffect(() => {
    const handleLocationChange = () => setRoute(routeFromPathname(window.location.pathname));
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  function navigate(path: AppPath) {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setRoute(routeFromPathname(path));
  }

  async function handleAuthenticated() {
    await onAuthenticated();
    navigate(ROUTES.EDITOR);
  }

  if (route === 'login' || route === 'signup') {
    return <AuthPage mode={route} onAuthenticated={handleAuthenticated} onNavigate={navigate} />;
  }

  return (
    <DiagramGeneratorPage
      isSessionLoading={isSessionLoading}
      onSignIn={() => navigate(ROUTES.AUTH.SIGN_IN)}
      onSignOut={onSignOut}
      user={user}
    />
  );
}
