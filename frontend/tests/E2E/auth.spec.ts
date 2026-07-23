import { test, expect } from '@playwright/test'
import { PASSWORD, registerUser, uniqueEmail } from './helpers'

test.describe('Authentication Flows', () => {
  test('should login successfully and redirect to dashboard', async ({
    page,
    request,
  }) => {
    const user = await registerUser(request)

    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /your workspaces/i })).toBeVisible()
  })

  test('should register successfully and auto-login', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Full name').fill('New E2E User')
    await page.getByLabel('Email').fill(uniqueEmail('register'))
    await page.locator('#password').fill(PASSWORD)
    await page.locator('#passwordConfirmation').fill(PASSWORD)
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your workspaces/i })).toBeVisible()
  })

  test('should logout and clear session', async ({ page, request }) => {
    const user = await registerUser(request)
    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })

    await page.getByRole('button', { name: /log out/i }).click()

    await expect(page).toHaveURL(/\/login/)
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'))
    expect(refreshToken).toBeNull()

    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should persist session after page reload', async ({ page, request }) => {
    const user = await registerUser(request)

    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })

    expect(
      await page.evaluate(() => localStorage.getItem('refreshToken'))
    ).toBeNull()
    const cookiesBefore = await page.context().cookies()
    expect(cookiesBefore.some((cookie) => cookie.name === 'collabwave_refresh')).toBe(true)

    await page.reload()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /your workspaces/i })).toBeVisible()

    expect(
      await page.evaluate(() => localStorage.getItem('refreshToken'))
    ).toBeNull()
    const cookiesAfter = await page.context().cookies()
    expect(cookiesAfter.some((cookie) => cookie.name === 'collabwave_refresh')).toBe(true)
  })
})
