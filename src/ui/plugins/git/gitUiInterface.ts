/**
 * Git UI Plugin Interface
 * 
 * Defines the contract for UI-specific Git provider implementations.
 * All Git UI plugins must implement this interface to handle authentication flows.
 */

import { Page } from '@playwright/test';

export interface GitPlugin {
    /**
     * Performs authentication through the Developer Hub UI.
     * Handles the complete login flow for the specific Git provider.
     * 
     * @param page - Playwright Page object for UI interactions
     */
    login(page: Page): Promise<void>;
} 