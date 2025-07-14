# GitHub Integration UI Test

This document describes the GitHub integration UI test for RHTAP (Red Hat Trusted Application Pipeline).

## Overview

The GitHub integration test verifies that GitHub "View Source" links are properly displayed and accessible in the Developer Hub UI.

## Test Structure

### Test File: `tests/tssc/ui.test.ts`

The test performs the following steps:

1. **Navigate to Component**: Goes directly to a component page in the Developer Hub
2. **Find GitHub Link**: Searches for "View Source" links that point to GitHub repositories
3. **Verify Clickability**: Ensures the link is clickable and enabled
4. **Check Accessibility**: Verifies the GitHub repository is accessible (HTTP status check)

### Key Features

- **Direct Navigation**: No complex component creation - goes straight to testing
- **Multiple Selectors**: Uses various CSS selectors to find GitHub links reliably
- **Robust Verification**: Checks both UI presence and actual repository accessibility
- **Clear Logging**: Provides detailed console output for debugging

## Configuration

### Playwright Configuration: `playwright-ui-only.config.ts`

- **Isolation**: Dedicated configuration for UI tests only
- **Authentication**: Uses saved authentication state from `playwright/.auth/user.json`
- **Reporting**: Outputs to `playwright-report-ui-only` folder
- **Debugging**: Runs in headed mode for visibility

## Running the Test

```bash
# Set environment variables if needed
export IMAGE_REGISTRY_ORG=test-org
export GITHUB_ORGANIZATION=test-org

# Run the UI test
npx playwright test tests/tssc/ui.test.ts --config=playwright-ui-only.config.ts
```

## Expected Output

```
✅ Found GitHub link: "View Source, Opens in a new window" -> https://github.com/org/repo
✅ Step 2 complete: Found "View Source" link
✅ Step 3 complete: Link is clickable
✅ Step 4 complete: Link is accessible (200)
🎉 GitHub integration test completed successfully!
```

## Architecture

### Git Plugin Interface

The `src/ui/plugins/git/gitUiInterface.ts` provides a consistent interface for Git provider UI plugins, supporting future extensibility for different Git providers.

## Troubleshooting

- **Authentication**: Ensure `playwright/.auth/user.json` contains valid session data
- **Network**: Check that the GitHub repository is publicly accessible
- **Selectors**: If GitHub links aren't found, verify the component page contains the expected elements 