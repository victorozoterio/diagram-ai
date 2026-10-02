import { expect, test } from '@playwright/test';

const apiURL = 'http://127.0.0.1:3100';
const webURL = 'http://127.0.0.1:5174';
const testUser = {
  email: `e2e-login-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
  name: 'Usuário E2E',
  password: 'DiagramAiE2E-2026!',
};

test.beforeAll(async ({ request }) => {
  const response = await request.post(`${apiURL}/api/auth/sign-up/email`, {
    data: {
      callbackURL: `${webURL}/`,
      ...testUser,
    },
    headers: {
      origin: webURL,
    },
  });

  expect(response.ok(), await response.text()).toBe(true);
});

test('usuário autenticado por e-mail e senha acessa Meus diagramas', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('E-mail').fill(testUser.email);
  await page.getByLabel('Senha').fill(testUser.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page).toHaveURL(`${webURL}/`);
  await expect(page.getByRole('heading', { name: 'Meus diagramas' })).toBeVisible();
});
