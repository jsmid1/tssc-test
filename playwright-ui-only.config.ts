import { defineConfig } from '@playwright/test';
import path from 'path';

// Authentication file path
const authFile = path.join(__dirname, 'playwright/.auth/user.json');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/ui.test.ts',
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-ui-only' }], ['list']],
  timeout: 60000,
  projects: [
    {
      name: 'ui-test',
      testMatch: '**/ui.test.ts',
      use: {
        // Use the saved authentication state
        storageState: authFile,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Run in headed mode to see what's happening
  },
}); 