import styles from './AuthenticatedUserMenu.module.css';

export type AuthenticatedUser = {
  email: string;
  image?: string | null;
  name: string;
};

type AuthenticatedUserMenuProps = {
  user: AuthenticatedUser;
  onSignOut: () => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AuthenticatedUserMenu({ user, onSignOut }: AuthenticatedUserMenuProps) {
  return (
    <details className={styles.menu}>
      <summary aria-label='Abrir menu da conta'>
        {user.image ? <img alt='' src={user.image} /> : <span className={styles.avatar}>{initials(user.name)}</span>}
      </summary>
      <div className={styles.popover} role='menu'>
        <strong>{user.name}</strong>
        <span>{user.email}</span>
        <button onClick={onSignOut} type='button'>
          Sair
        </button>
      </div>
    </details>
  );
}
