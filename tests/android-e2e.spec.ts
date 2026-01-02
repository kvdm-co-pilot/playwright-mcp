/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect } from './fixtures';

/**
 * End-to-End Scenario Tests for Android Tools
 * 
 * These tests demonstrate real-world automation workflows using the Android tools.
 * They use the mock driver for CI but the same patterns work with real Appium.
 */
test.describe('Android E2E Scenarios', () => {
  test.describe('Login Flow Scenario', () => {
    test('complete login workflow with Android tools', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Step 1: Launch the app
      const launchResponse = await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.app' },
      });
      expect(launchResponse.isError).toBeFalsy();
      
      // Step 2: Take initial screenshot to verify app state
      const initialScreenshot = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });
      expect(initialScreenshot.isError).toBeFalsy();
      expect(initialScreenshot.content[1].type).toBe('image');
      
      // Step 3: Input username using data-testid selector
      const usernameInput = await client.callTool({
        name: 'android_input_text',
        arguments: { 
          selector: '[data-testid="username-field"]', 
          text: 'testuser@example.com',
          clear: true 
        },
      });
      expect(usernameInput.isError).toBeFalsy();
      
      // Step 4: Input password using ID selector
      const passwordInput = await client.callTool({
        name: 'android_input_text',
        arguments: { 
          selector: '#password-field', 
          text: 'SecurePass123!',
          clear: true 
        },
      });
      expect(passwordInput.isError).toBeFalsy();
      
      // Step 5: Tap login button using text selector
      const loginTap = await client.callTool({
        name: 'android_tap',
        arguments: { selector: 'text=Login' },
      });
      expect(loginTap.isError).toBeFalsy();
      
      // Step 6: Take screenshot to verify logged in state
      const finalScreenshot = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });
      expect(finalScreenshot.isError).toBeFalsy();
    });
  });

  test.describe('Form Filling Scenario', () => {
    test('fill multiple form fields and submit', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Launch app
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.forms' },
      });
      
      // Fill form fields using various selector types
      const formFields = [
        { selector: '#first-name', text: 'John' },
        { selector: '#last-name', text: 'Doe' },
        { selector: '[data-testid="email"]', text: 'john.doe@example.com' },
        { selector: '[data-testid="phone"]', text: '+1234567890' },
        { selector: '.address-field', text: '123 Main St' },
      ];
      
      for (const field of formFields) {
        const response = await client.callTool({
          name: 'android_input_text',
          arguments: { selector: field.selector, text: field.text, clear: true },
        });
        expect(response.isError).toBeFalsy();
      }
      
      // Submit form using button with text
      const submitResponse = await client.callTool({
        name: 'android_tap',
        arguments: { selector: 'button:has-text("Submit")' },
      });
      expect(submitResponse.isError).toBeFalsy();
    });
  });

  test.describe('Navigation Scenario', () => {
    test('navigate through app screens using tap', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Launch app
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.navigation' },
      });
      
      // Navigate through screens using coordinates and selectors
      const navigations = [
        { name: 'Menu tap', args: { selector: '#menu-button' } },
        { name: 'Settings tap', args: { selector: 'text=Settings' } },
        { name: 'Back tap', args: { x: 50, y: 100 } }, // Coordinate tap for back
        { name: 'Profile tap', args: { selector: '[data-testid="profile-tab"]' } },
      ];
      
      for (const nav of navigations) {
        const response = await client.callTool({
          name: 'android_tap',
          arguments: nav.args,
        });
        expect(response.isError).toBeFalsy();
      }
    });
  });

  test.describe('Mixed Selector Pattern Tests', () => {
    test('uses all supported selector patterns', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Launch app
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.selectors' },
      });
      
      // Test each selector pattern
      const selectorPatterns = [
        { pattern: 'ID selector', selector: '#my-element' },
        { pattern: 'data-testid (double quotes)', selector: '[data-testid="element1"]' },
        { pattern: 'data-testid (single quotes)', selector: '[data-testid=\'element2\']' },
        { pattern: 'text selector', selector: 'text=Click Me' },
        { pattern: 'class selector', selector: '.my-button' },
        { pattern: 'button:has-text', selector: 'button:has-text("Submit")' },
        { pattern: 'input:has-text', selector: 'input:has-text("Search")' },
      ];
      
      for (const { pattern, selector } of selectorPatterns) {
        const response = await client.callTool({
          name: 'android_tap',
          arguments: { selector },
        });
        expect(response.isError, `Failed for pattern: ${pattern}`).toBeFalsy();
      }
    });
  });

  test.describe('Error Handling Scenarios', () => {
    test('handles all error cases gracefully', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Test various error conditions
      const errorCases = [
        {
          tool: 'android_launch_app',
          args: {},
          expectedError: 'requires either packageName or appPath',
        },
        {
          tool: 'android_tap',
          args: {},
          expectedError: 'requires either selector or (x, y) coordinates',
        },
        {
          tool: 'android_input_text',
          args: { text: 'test' },
          expectedError: 'requires selector parameter',
        },
        {
          tool: 'android_input_text',
          args: { selector: '#field' },
          expectedError: 'requires text parameter',
        },
      ];
      
      for (const { tool, args, expectedError } of errorCases) {
        const response = await client.callTool({
          name: tool,
          arguments: args,
        });
        expect(response.isError, `${tool} should error with args: ${JSON.stringify(args)}`).toBe(true);
        expect(response.content[0].text).toContain(expectedError);
      }
    });
  });

  test.describe('Screenshot Workflow', () => {
    test('captures screenshots at different stages', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      
      // Launch app
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.screenshots' },
      });
      
      // Take full screen screenshot
      const fullScreen = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });
      expect(fullScreen.isError).toBeFalsy();
      expect(fullScreen.content).toHaveLength(2);
      expect(fullScreen.content[0].type).toBe('text');
      expect(fullScreen.content[1].type).toBe('image');
      
      // Take element screenshot
      const elementShot = await client.callTool({
        name: 'android_screenshot',
        arguments: { selector: '#header-logo' },
      });
      expect(elementShot.isError).toBeFalsy();
      expect(elementShot.content[1].type).toBe('image');
      
      // Take screenshot with path (would save to file with real Appium)
      const savedShot = await client.callTool({
        name: 'android_screenshot',
        arguments: { path: '/tmp/screenshot.png' },
      });
      expect(savedShot.isError).toBeFalsy();
    });
  });
});

test.describe('Android + Web Tools Coexistence', () => {
  test('can use both Android and web tools in same session', async ({ startClient, server }) => {
    const { client } = await startClient({ androidMock: true });
    
    // Verify Android tools are available
    const { tools } = await client.listTools();
    const toolNames = tools.map((t: { name: string }) => t.name);
    
    // Check Android tools
    expect(toolNames).toContain('android_launch_app');
    expect(toolNames).toContain('android_tap');
    expect(toolNames).toContain('android_input_text');
    expect(toolNames).toContain('android_screenshot');
    
    // Check web tools still available
    expect(toolNames).toContain('browser_navigate');
    expect(toolNames).toContain('browser_click');
    expect(toolNames).toContain('browser_snapshot');
    expect(toolNames).toContain('browser_type');
    
    // Use Android tool
    const androidResponse = await client.callTool({
      name: 'android_tap',
      arguments: { selector: '#button' },
    });
    expect(androidResponse.isError).toBeFalsy();
    
    // Use web tool in same session
    server.setContent('/', '<title>Test</title><button>Web Button</button>', 'text/html');
    const webResponse = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });
    expect(webResponse.isError).toBeFalsy();
  });
});
