import { z } from 'zod';

const minimumPasswordLength = 8;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    email: z.string().trim().min(1, 'E-mail é obrigatório'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .min(minimumPasswordLength, `A senha deve ter pelo menos ${minimumPasswordLength} caracteres`),
    passwordConfirmation: z.string().min(1, 'Confirme sua senha'),
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
