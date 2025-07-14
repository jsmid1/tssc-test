import { defineConfig } from '@playwright/test';
import path from 'path';
import { TestItem } from './src/playwright/testItem';
import { GitType } from './src/rhtap/core/integration/git';
import { CIType } from './src/rhtap/core/integration/ci';
import { ImageRegistryType } from './src/rhtap/core/integration/registry';
import { TemplateType } from './src/rhtap/core/integration/git/templates/templateFactory';

// Authentication file path
const authFile = path.join(__dirname, 'playwright/.auth/user.json');

// Create a test item for UI testing
const testItem = new TestItem(
  'ui-test-component',
  TemplateType.GO,
  ImageRegistryType.QUAY,
  GitType.GITHUB,
  CIType.TEKTON,
  '',
  ''
);

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
        testItem: testItem as any, // Cast to any to bypass TypeScript type checking
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