import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--disable-gpu',
          ],
        }
      : undefined,
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/api/health',
    timeout: 30000,
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: '.data/e2e.sqlite',
      ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
      COOKIE_SECURE: 'false',
    },
  },
});
