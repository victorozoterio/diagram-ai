type GoogleCredentials = {
  clientId: string;
  clientSecret: string;
};

export const createAuthOptions = (secret: string, baseURL: string, google?: GoogleCredentials) => ({
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
  ...(google
    ? {
        socialProviders: {
          google: {
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            redirectURI: `${baseURL.replace(/\/$/, '')}/api/auth/callback/google`,
          },
        },
      }
    : {}),
});
