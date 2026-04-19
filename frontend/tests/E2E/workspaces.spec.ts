import { test, expect } from '@playwright/test'
import {
  createWorkspaceViaApi,
  loginViaUi,
  registerUser,
} from './helpers'

test.describe('Workspace Management', () => {
  test('should create new workspace successfully', async ({ page, request }) => {
    const user = await registerUser(request)
    const workspaceName = `Test Workspace ${Date.now()}`

    await loginViaUi(page, user.email, user.password)
    await page.getByRole('button', { name: /^new workspace$/i }).click()
    await page.getByPlaceholder('Workspace name').fill(workspaceName)
    await page.getByPlaceholder('Description (optional)').fill('Test Description')
    await page.getByRole('button', { name: /^create$/i }).click()

    await expect(page.getByRole('button', { name: new RegExp(workspaceName) })).toBeVisible()
  })

  test('should display list of workspaces', async ({ page, request }) => {
    const user = await registerUser(request, 'Workspace List User')
    const workspace = await createWorkspaceViaApi(request, user.accessToken)

    await loginViaUi(page, user.email, user.password)

    await expect(page.getByRole('button', { name: new RegExp(workspace.name) })).toBeVisible()
  })

  test('should navigate to workspace board', async ({ page, request }) => {
    const user = await registerUser(request, 'Workspace Board User')
    const workspace = await createWorkspaceViaApi(request, user.accessToken)

    await loginViaUi(page, user.email, user.password)
    await page.getByRole('button', { name: new RegExp(workspace.name) }).click()

    await expect(page).toHaveURL(/\/board\/[^/]+$/)
    await expect(page.getByRole('heading', { name: /board/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /backlog|to do|in progress|review|done/i }).first()).toBeVisible()
  })

  test('should navigate back to workspace list from board', async ({ page, request }) => {
    const user = await registerUser(request, 'Workspace Back User')
    const workspace = await createWorkspaceViaApi(request, user.accessToken)

    await loginViaUi(page, user.email, user.password)
    await page.getByRole('button', { name: new RegExp(workspace.name) }).click()
    await expect(page).toHaveURL(/\/board\/[^/]+$/)

    await page.getByRole('button', { name: /back to workspaces/i }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /your workspaces/i })).toBeVisible()
  })
})
