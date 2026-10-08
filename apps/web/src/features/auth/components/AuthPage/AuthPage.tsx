import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { authClient, getEnabledSocialProviders, type SocialProvider } from '@/auth/auth-client';
import { BrandLogo } from '@/components/BrandLogo/BrandLogo';
import { ROUTES } from '@/routes/routes';
import { AuthFormField } from '../AuthFormField';
import styles from './AuthPage.module.css';
import { signInSchema } from './sign-in.schema';
import { signUpSchema } from './sign-up.schema';

export type AuthPageMode = 'login' | 'signup';

type AuthPageProps = {
  mode: AuthPageMode;
  onAuthenticated: () => Promise<void>;
  onNavigate: (path: typeof copy.login.alternatePath | typeof copy.signup.alternatePath) => void;
};

type LoginError = {
  kind: 'credentials' | 'request';
  message: string;
};

const copy = {
  login: {
    title: 'Boas-vindas de volta',
    description: 'Entre para continuar criando seus modelos.',
    submit: 'Entrar',
    alternateText: 'Ainda não possui uma conta?',
    alternateAction: 'Criar conta',
    alternatePath: ROUTES.AUTH.SIGN_UP,
  },
  signup: {
    title: 'Crie sua conta',
    description: 'Comece a organizar seus modelos com o Diagram.AI.',
    submit: 'Criar conta',
    alternateText: 'Já possui uma conta?',
    alternateAction: 'Entrar',
    alternatePath: ROUTES.AUTH.SIGN_IN,
  },
};

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

function errorMessage(error: { message?: string } | null, fallback: string) {
  return error?.message || fallback;
}

function loginErrorMessage(error: { status?: number } | null): LoginError {
  return error?.status === 401
    ? { kind: 'credentials', message: 'Credenciais inválidas' }
    : { kind: 'request', message: 'Erro ao fazer login. Tente novamente mais tarde.' };
}

function authenticatedCallbackUrl() {
  return new URL(ROUTES.DIAGRAMS, window.location.origin).toString();
}

export function AuthPage({ mode, onAuthenticated, onNavigate }: AuthPageProps) {
  const form = useForm<AuthFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema) as unknown as Resolver<AuthFormValues>,
  });
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);
  const [enabledSocialProviders, setEnabledSocialProviders] = useState<SocialProvider[]>([]);
  const isSignup = mode === 'signup';
  const content = copy[mode];
  const { errors, isSubmitting, touchedFields } = form.formState;
  const passwordError = errors.password?.message;
  const passwordMessage = passwordError ? undefined : !isSignup ? loginError?.message : undefined;
  const hasCredentialError = !isSignup && loginError?.kind === 'credentials';
  const hasSocialProviders = enabledSocialProviders.length > 0;

  useEffect(() => {
    let isCurrent = true;

    void getEnabledSocialProviders().then((providers) => {
      if (isCurrent) setEnabledSocialProviders(providers);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  function clearAuthenticationErrors() {
    setLoginError(null);
    setAuthError(null);
  }

  async function submit(values: AuthFormValues) {
    setLoginError(null);
    setAuthError(null);
    try {
      const result = isSignup
        ? await authClient.signUp.email({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
            callbackURL: authenticatedCallbackUrl(),
          })
        : await authClient.signIn.email({
            email: values.email.trim(),
            password: values.password,
            callbackURL: authenticatedCallbackUrl(),
          });

      if (result.error) {
        if (isSignup) {
          setAuthError(errorMessage(result.error, 'Não foi possível concluir a autenticação.'));
        } else {
          setLoginError(loginErrorMessage(result.error));
        }
        return;
      }

      await onAuthenticated();
    } catch {
      if (isSignup) {
        setAuthError('Não foi possível se comunicar com o servidor de autenticação.');
      } else {
        setLoginError({ kind: 'request', message: 'Erro ao fazer login. Tente novamente mais tarde.' });
      }
    }
  }

  async function signInWith(provider: SocialProvider) {
    setAuthError(null);
    setSocialProvider(provider);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: authenticatedCallbackUrl(),
      });

      if (result.error) {
        setAuthError(
          errorMessage(result.error, `Não foi possível continuar com ${provider === 'google' ? 'Google' : 'GitHub'}.`),
        );
        setSocialProvider(null);
      }
    } catch {
      setAuthError(`Não foi possível iniciar a autenticação com ${provider === 'google' ? 'Google' : 'GitHub'}.`);
      setSocialProvider(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby='auth-title'>
        <div className={styles.brand}>
          <span className={styles.logoMark}>
            <BrandLogo />
          </span>
          <span>Diagram.AI</span>
        </div>
        <div className={styles.intro}>
          <h1 id='auth-title'>{content.title}</h1>
          <p>{content.description}</p>
        </div>

        <form className={styles.form} noValidate onSubmit={form.handleSubmit(submit)}>
          {isSignup && (
            <AuthFormField
              autoComplete='name'
              disabled={isSubmitting || socialProvider !== null}
              error={errors.name?.message}
              id='name'
              label='Nome'
              type='text'
              {...form.register('name', { onChange: clearAuthenticationErrors })}
            />
          )}
          <AuthFormField
            autoComplete='email'
            disabled={isSubmitting || socialProvider !== null}
            error={errors.email?.message}
            id='email'
            invalid={hasCredentialError}
            label='E-mail'
            type='email'
            {...form.register('email', { onChange: clearAuthenticationErrors })}
          />
          <AuthFormField
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            disabled={isSubmitting || socialProvider !== null}
            error={passwordError}
            id='password'
            invalid={hasCredentialError}
            label='Senha'
            message={passwordMessage}
            type='password'
            {...form.register('password', {
              onChange: () => {
                clearAuthenticationErrors();
                if (isSignup && touchedFields.passwordConfirmation) {
                  void form.trigger('passwordConfirmation');
                }
              },
            })}
          />
          {isSignup && (
            <AuthFormField
              autoComplete='new-password'
              disabled={isSubmitting || socialProvider !== null}
              error={errors.passwordConfirmation?.message}
              id='password-confirmation'
              label='Confirmar senha'
              type='password'
              {...form.register('passwordConfirmation', { onChange: clearAuthenticationErrors })}
            />
          )}

          {authError && <p className={styles.authError}>{authError}</p>}

          <button className={styles.primaryButton} disabled={isSubmitting || socialProvider !== null} type='submit'>
            {isSubmitting ? 'Aguarde...' : content.submit}
          </button>
        </form>

        {hasSocialProviders && (
          <>
            <div className={styles.divider} aria-hidden='true'>
              <span>ou</span>
            </div>

            <div className={styles.socialActions}>
              {enabledSocialProviders.includes('google') && (
                <button
                  className={styles.socialButton}
                  disabled={isSubmitting || socialProvider !== null}
                  onClick={() => void signInWith('google')}
                  type='button'
                >
                  <FcGoogle aria-hidden='true' className={styles.providerIcon} />
                  {socialProvider === 'google' ? 'Redirecionando...' : 'Continuar com Google'}
                </button>
              )}
              {enabledSocialProviders.includes('github') && (
                <button
                  className={styles.socialButton}
                  disabled={isSubmitting || socialProvider !== null}
                  onClick={() => void signInWith('github')}
                  type='button'
                >
                  <FaGithub aria-hidden='true' className={styles.providerIcon} />
                  {socialProvider === 'github' ? 'Redirecionando...' : 'Continuar com GitHub'}
                </button>
              )}
            </div>
          </>
        )}

        <p className={styles.alternate}>
          {content.alternateText}{' '}
          <button onClick={() => onNavigate(content.alternatePath)} type='button'>
            {content.alternateAction}
          </button>
        </p>
      </section>
    </main>
  );
}
