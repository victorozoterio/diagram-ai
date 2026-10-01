import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'E-mail é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
