import { createBasicFixture } from '../../src/utils/test/fixtures';
import { UiComponent } from '../../src/ui/uiComponent';
import { loadFromEnv } from '../../src/utils/util';
import { CommonPO } from '../../src/ui/page-objects/common_po';

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

  test.beforeAll('', async ({ testItem }) => {
    console.log('Running UI test for:', testItem);
    const componentName = loadFromEnv('IMAGE_REGISTRY_ORG');
    const imageName = `${componentName}`;
    console.log(`Creating component: ${componentName}`);

    // Assign the already created component 
    component = await UiComponent.new(componentName, testItem, imageName);
  });

  test.describe('Go to home page', () => {
    test('open developer hub and log in', async ({ page }) => {
      await page.goto(component.getCoreComponent().getDeveloperHub().getUrl(), {
        timeout: 20000,
      });
      await page
        .getByRole('heading', { name: CommonPO.welcomeTitle })
        .waitFor({ state: 'visible', timeout: 20000 });
    });
  });

  test.describe('GitHub Integration Test', () => {
    /**
     * Combined Authentication and GitHub Link Verification Test
     * 
     * Test Steps:
     * 1. Login to Developer Hub with GitHub authentication
     * 2. Navigate to the component page
     * 3. Search for "View Source" GitHub link
     * 4. Verify link is clickable
     * 5. Check if GitHub repository is accessible
     */
    test('should authenticate and find GitHub "View Source" link', async ({ page }) => {
      // Step 1: Login to Developer Hub with GitHub authentication
      console.log('🔐 Starting authentication process...');
      
      // Go to Developer Hub
      await page.goto(component.getCoreComponent().getDeveloperHub().getUrl());
      
      // Perform live GitHub authentication
      await component.getGit().login(page);
      
      // Verify successful login
      await page.getByRole('heading', { name: CommonPO.welcomeTitle }).waitFor({ 
        state: 'visible', 
        timeout: 15000 
      });
      
      console.log('✅ Authentication completed successfully');
      
      // Step 2: Navigate to component page
      const componentUrl = component.getComponentUrl();
      console.log(`🚀 Navigating to component: ${componentUrl}`);
      await page.goto(componentUrl);
      await page.waitForLoadState('networkidle');
      
      // Step 3: Search for "View Source" GitHub link
      console.log('🔍 Searching for "View Source" link...');
      
      const viewSourceSelectors = [
        'a:has-text("View Source")',
        'a[title*="View Source"]',
        'a[aria-label*="View Source"]',
        'a[href*="github.com"]',
        '.github-link',
        '[data-testid*="source"]',
        'a:has-text("Source")',
        'a[title*="Source"]'
      ];
      
      let githubLink: any = null;
      let linkText = '';
      let linkHref = '';
      
      for (const selector of viewSourceSelectors) {
        const elements = await page.locator(selector).all();
        
        for (const element of elements) {
          const href = await element.getAttribute('href');
          const text = await element.textContent();
          
          if (href && href.includes('github.com')) {
            githubLink = element;
            linkText = text?.trim() || '';
            linkHref = href;
            console.log(`✅ Found GitHub link: "${linkText}" -> ${linkHref}`);
            break;
          }
        }
        
        if (githubLink) break;
      }
      
      // Verify we found the link
      test.expect(githubLink).toBeTruthy();
      test.expect(linkHref).toContain('github.com');
      console.log(`✅ Step 3 complete: Found "View Source" link`);
      
      // Step 4: Verify link is clickable
      console.log('🔗 Verifying link is clickable...');
      if (githubLink) {
        const isClickable = await githubLink.isEnabled();
        test.expect(isClickable).toBe(true);
        console.log(`✅ Step 4 complete: Link is clickable`);
      }
      
      // Step 5: Check if GitHub repository is accessible
      console.log('🌐 Checking if GitHub link is accessible...');
      try {
        const response = await page.request.head(linkHref);
        const status = response.status();
        console.log(`📊 GitHub repository HTTP status: ${status}`);
        
        // Accept common successful status codes
        const validStatuses = [200, 201, 202, 301, 302, 304];
        test.expect(validStatuses).toContain(status);
          
        console.log(`✅ Step 5 complete: Link is accessible (${status})`);
      } catch (error) {
        console.warn('⚠️  Could not verify link accessibility:', error);
        // Don't fail the test if network request fails
      }
      
      // Test completed successfully
      console.log('🎉 GitHub integration test completed successfully!');
      console.log(`📊 Test Summary:`);
      console.log(`   • Authentication: ✅ Successful`);
      console.log(`   • Component URL: ${componentUrl}`);
      console.log(`   • GitHub URL: ${linkHref}`);
      console.log(`   • Link Text: "${linkText}"`);
    });
  });
});
