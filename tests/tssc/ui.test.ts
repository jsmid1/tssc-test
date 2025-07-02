import { CommonPO } from '../../src/ui/page-objects/common_po';
import { UiComponent } from '../../src/ui/uiComponent';
import { createBasicFixture } from '../../src/utils/test/fixtures';
import { loadFromEnv } from '../../src/utils/util';
import { Page } from '@playwright/test';

/**
 * Create a basic test fixture with testItem
 */
const test = createBasicFixture();

/**
 * A complete test scenario for RHTAP UI plugins test:
 *
 * This test suite check the plugin in the UI and uses the component from backend e2e test.
 * This test should not
 * 1. Login to the UI
 * TODO:
 * 2. Find a component in the UI
 * 3. Check the ArgoCD integration on the Overview page
 * 4. Check the CI integration and existing pipelines
 * 5. Check the CD tab and verify information shown
 * 6. Check the Image Registry tab and verify information shown
 */
test.describe('RHTAP UI Test Suite', () => {
  // Shared variables for test steps
  let component: UiComponent;
  let page: Page;

  test.beforeAll('', async ({ testItem, browser }) => {
    console.log('Running UI test for:', testItem);
    const componentName = loadFromEnv('IMAGE_REGISTRY_ORG');
    const imageName = `${componentName}`;
    console.log(`Creating component: ${componentName}`);

    // Assign the already created component
    component = await UiComponent.new(componentName, testItem, imageName);

    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }
  });

  test.describe('Go to home page', () => {
    test('Go to DH home page', async () => {
      await page.goto(component.getCoreComponent().getDeveloperHub().getUrl(), {
        timeout: 10000,
      });
      await page
        .getByRole('heading', { name: CommonPO.welcomeTitle })
        .waitFor({ state: 'visible', timeout: 10000 });
    });
  });

  test.describe('Go to home page again', () => {
    test('Go to DH home page again', async () => {
      await page.goto(component.getCoreComponent().getDeveloperHub().getUrl(), {
        timeout: 10000,
      });
      await page
        .getByRole('heading', { name: CommonPO.welcomeTitle })
        .waitFor({ state: 'visible', timeout: 10000 });
    });
  });
});
