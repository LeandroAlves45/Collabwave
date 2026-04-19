import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import {
  createWorkspaceViaApi,
  loginViaUi,
  registerUser,
} from './helpers'

async function openBoard(
  page: Page,
  request: APIRequestContext
): Promise<{ workspaceName: string }> {
  const user = await registerUser(request, 'Board E2E User')
  const workspace = await createWorkspaceViaApi(request, user.accessToken)

  await loginViaUi(page, user.email, user.password)
  await page.getByRole('button', { name: new RegExp(workspace.name) }).click()
  await expect(page).toHaveURL(/\/board\/[^/]+$/)
  await expect(page.getByRole('heading', { name: /board/i })).toBeVisible()

  return { workspaceName: workspace.name }
}

async function createTask(page: Page, title: string, description?: string): Promise<void> {
  await page.getByRole('button', { name: /add task/i }).first().click()
  await page.getByPlaceholder('Task title').fill(title)

  if (description) {
    await page.getByPlaceholder('Description (optional)').fill(description)
  }

  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText(title)).toBeVisible()
}

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page, request }) => {
    await openBoard(page, request)
  })

  test('should load board with real column names', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /backlog/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /to do/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /in progress/i })).toBeVisible()
  })

  test('should create new task successfully', async ({ page }) => {
    const taskTitle = `E2E Test Task ${Date.now()}`

    await createTask(page, taskTitle, 'E2E test description')

    await expect(page.getByText(taskTitle)).toBeVisible()
    await expect(page.getByText('E2E test description')).toBeVisible()
  })

  test('should display task in correct column', async ({ page }) => {
    const taskTitle = `Column Test Task ${Date.now()}`

    await createTask(page, taskTitle)

    const firstColumn = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: /backlog/i }) })
      .first()
    await expect(firstColumn.getByText(taskTitle)).toBeVisible()
  })

  test('should move task between columns', async ({ page }) => {
    const taskTitle = `Move Test ${Date.now()}`

    await createTask(page, taskTitle)

    const task = page.getByText(taskTitle)
    const doneColumn = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: /^done$/i }) })
      .first()

    await task.dragTo(doneColumn)
    await expect(doneColumn.getByText(taskTitle)).toBeVisible()
  })

  test('should delete task successfully', async ({ page }) => {
    const taskTitle = `Delete Test ${Date.now()}`

    await createTask(page, taskTitle)

    const taskCard = page.locator('div').filter({ hasText: taskTitle }).first()
    await taskCard.hover()
    await taskCard.getByTitle('Delete task').click()

    await expect(page.getByText(taskTitle)).not.toBeVisible()
  })

  test('should synchronize tasks between users via Socket.io', async ({
    browser,
    request,
  }) => {
    const user = await registerUser(request, 'Socket E2E User')
    const workspace = await createWorkspaceViaApi(request, user.accessToken)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    for (const page of [page1, page2]) {
      await loginViaUi(page, user.email, user.password)
      await page.getByRole('button', { name: new RegExp(workspace.name) }).click()
      await expect(page).toHaveURL(/\/board\/[^/]+$/)
    }

    const syncTaskTitle = `Socket.io Sync Test ${Date.now()}`
    await createTask(page1, syncTaskTitle)

    await expect(page2.getByText(syncTaskTitle)).toBeVisible({ timeout: 10000 })

    await context1.close()
    await context2.close()
  })

  test('should reconnect Socket.io after network disconnect', async ({
    page,
    context,
  }) => {
    await context.setOffline(true)
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(2000)

    const reconnectTaskTitle = `Reconnect Test ${Date.now()}`
    await createTask(page, reconnectTaskTitle)

    await expect(page.getByText(reconnectTaskTitle)).toBeVisible()
  })
})
