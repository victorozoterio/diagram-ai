type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

type SocialProviderCredentials = {
  google: OAuthCredentials;
  github: OAuthCredentials;
};

const redirectURI = (baseURL: string, provider: 'google' | 'github') =>
  `${baseURL.replace(/\/$/, '')}/api/auth/callback/${provider}`;

export const createAuthOptions = (secret: string, baseURL: string, providers: SocialProviderCredentials) => {
  return {
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        joins: true,
      },
    },
    socialProviders: {
      google: {
        clientId: providers.google.clientId,
        clientSecret: providers.google.clientSecret,
        redirectURI: redirectURI(baseURL, 'google'),
      },
      github: {
        clientId: providers.github.clientId,
        clientSecret: providers.github.clientSecret,
        redirectURI: redirectURI(baseURL, 'github'),
        scope: ['user:email'],
      },
    },
  };
};
