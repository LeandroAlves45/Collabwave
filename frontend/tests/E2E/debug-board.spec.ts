import { test } from '@playwright/test'

test('debug: capture vite error', async ({ page }) => {
  // Capture all console messages
  const consoleLogs: string[] = []
  page.on('console', msg => {
    const logText = `[${msg.type()}] ${msg.text()}`
    consoleLogs.push(logText)
    if (msg.type() === 'error') {
      console.log(logText)
    }
  })

  // Capture page errors
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.toString())
  })

  console.log('Logging in...')
  await page.goto('http://localhost:5175/login')
  await page.locator('form').first().waitFor({ state: 'visible', timeout: 5000 })
  await page.fill('#email', 'test@example.com')
  await page.fill('#password', 'Password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/', { timeout: 10000 })

  await page.waitForTimeout(3000)

  // Try to get vite error message
  const viteError = await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay')
    if (overlay) {
      const errorContent = overlay.shadowRoot?.querySelector('[class*="error"]')?.textContent ||
                          overlay.textContent ||
                          'Vite error detected'
      return errorContent
    }
    return null
  })

  if (viteError) {
    console.log('\n=== VITE ERROR ===')
    console.log(viteError)
  }

  console.log('\n=== ALL CONSOLE LOGS ===')
  consoleLogs.forEach(log => console.log(log))

  // Check localStorage
  console.log('\n=== LOCALSTORAGE ===')
  const storage = await page.evaluate(() => {
    return {
      keys: Object.keys(localStorage),
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: localStorage.getItem('user')
    }
  })
  console.log(JSON.stringify(storage, null, 2))
})
