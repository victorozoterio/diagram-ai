type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

type SocialProviderCredentials = {
  google?: OAuthCredentials;
  github?: OAuthCredentials;
};

const redirectURI = (baseURL: string, provider: 'google' | 'github') =>
  `${baseURL.replace(/\/$/, '')}/api/auth/callback/${provider}`;

export const createAuthOptions = (
  secret: string,
  baseURL: string,
  trustedOrigin: string,
  providers: SocialProviderCredentials,
) => {
  const socialProviders = {
    ...(providers.google
      ? {
          google: {
            clientId: providers.google.clientId,
            clientSecret: providers.google.clientSecret,
            redirectURI: redirectURI(baseURL, 'google'),
          },
        }
      : {}),
    ...(providers.github
      ? {
          github: {
            clientId: providers.github.clientId,
            clientSecret: providers.github.clientSecret,
            redirectURI: redirectURI(baseURL, 'github'),
            scope: ['user:email'],
          },
        }
      : {}),
  };

  return {
    secret,
    baseURL,
    trustedOrigins: [trustedOrigin],
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        joins: true,
      },
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  };
};
