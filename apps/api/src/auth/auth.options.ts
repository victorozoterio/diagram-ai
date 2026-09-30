export const createAuthOptions = (secret: string, baseURL: string) => ({
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
});
