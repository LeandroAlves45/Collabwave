import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API_URL = 'http://localhost:3001/api'
export const PASSWORD = 'Password123'

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
}

export async function registerUser(
  request: APIRequestContext,
  name = 'E2E User'
): Promise<{ email: string; password: string; accessToken: string }> {
  const email = uniqueEmail()
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name, email, password: PASSWORD },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json()

  return {
    email,
    password: PASSWORD,
    accessToken: body.data.accessToken,
  }
}

export async function loginViaUi(
  page: Page,
  email: string,
  password = PASSWORD
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
  await expect(page.getByRole('heading', { name: /your workspaces/i })).toBeVisible({
    timeout: 15000,
  })
}

export async function createWorkspaceViaApi(
  request: APIRequestContext,
  accessToken: string,
  name = `E2E Workspace ${Date.now()}`
): Promise<{ id: string; name: string }> {
  const response = await request.post(`${API_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      name,
      description: 'Workspace created by E2E setup',
    },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json()

  return body.data
}
