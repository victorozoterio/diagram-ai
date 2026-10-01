import { authClient } from '@/auth/auth-client';
import { Router } from '@/routes';

export function App() {
  const { data: session, isPending, refetch } = authClient.useSession();

  async function handleAuthenticated() {
    await refetch();
  }

  async function handleSignOut() {
    await authClient.signOut();
    await refetch();
  }

  return (
    <Router
      isSessionLoading={isPending}
      onAuthenticated={handleAuthenticated}
      onSignOut={() => void handleSignOut()}
      user={session?.user ? { email: session.user.email, image: session.user.image, name: session.user.name } : null}
    />
  );
}
