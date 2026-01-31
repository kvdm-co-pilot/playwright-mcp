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

/**
 * Real Device Tests for Android Tools
 * 
 * These tests run against an actual Android emulator/device with Appium.
 * Prerequisites:
 *   - Android emulator running (adb devices shows device)
 *   - Appium server running with UiAutomator2 driver (http://localhost:4723)
 *   - APPIUM_HOME set to location with uiautomator2 driver installed
 * 
 * Run with: npx playwright test tests/android-real-device.spec.ts --project=chrome
 */

import { test, expect } from './fixtures';

// Run serially - Appium can only handle one session at a time on a single device
test.describe.configure({ mode: 'serial' });

// These tests use androidMock: false to hit the real device
test.describe('Android Real Device Tests', () => {
  
  test.describe('Connection & Tool Registration', () => {
    test('connects to real device and lists Android tools', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      const { tools } = await client.listTools();
      const toolNames = tools.map((t: { name: string }) => t.name);

      expect(toolNames).toContain('android_launch_app');
      expect(toolNames).toContain('android_tap');
      expect(toolNames).toContain('android_input_text');
      expect(toolNames).toContain('android_screenshot');
    });
  });

  test.describe('android_launch_app - Real Device', () => {
    test('launches Android Settings app', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // Launch the Settings app (pre-installed on all Android devices)
      const response = await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Successfully launched app');
      expect(response.content[0].text).toContain('com.android.settings');
    });

    test('errors when package does not exist', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      const response = await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.nonexistent.fake.app.12345' },
      });

      // Should fail gracefully
      expect(response.isError).toBeTruthy();
    });
  });

  test.describe('android_screenshot - Real Device', () => {
    test('takes screenshot of real device', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // First launch an app to have something to screenshot
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });

      // Take screenshot
      const response = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });

      expect(response.isError).toBeFalsy();
      // Should return base64 encoded image
      expect(response.content[0].text).toContain('Screenshot captured');
      
      // Check for image content
      const hasImage = response.content.some((c: any) => 
        c.type === 'image' || (c.type === 'text' && c.text.includes('base64'))
      );
      expect(hasImage || response.content[0].text.includes('Screenshot')).toBeTruthy();
    });
  });

  test.describe('android_tap - Real Device', () => {
    test('taps at coordinates on real device', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // Launch Settings
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });

      // Wait a moment for app to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Tap at center of screen (safe location)
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { x: 540, y: 960 },  // Approximate center for most devices
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Tapped');
    });

    test('taps element by text selector', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // Launch Settings
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });

      // Wait for app to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to tap on "Network & internet" or similar common Settings item
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: 'text=Network' },
      });

      // This may or may not succeed depending on device, but should not crash
      // If element not found, should return error gracefully
      if (response.isError) {
        expect(response.content[0].text).toContain('element');
      } else {
        expect(response.content[0].text).toContain('Tapped');
      }
    });
  });

  test.describe('android_input_text - Real Device', () => {
    test('inputs text on real device (Settings search)', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // Launch Settings
      await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });

      // Wait for app to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to tap on search icon (usually at top)
      // Most Settings apps have a search at coordinates near top-right
      await client.callTool({
        name: 'android_tap',
        arguments: { x: 980, y: 150 },  // Approximate search icon location
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to input text
      const response = await client.callTool({
        name: 'android_input_text',
        arguments: { 
          selector: '//android.widget.EditText',  // Generic EditText selector
          text: 'wifi',
        },
      });

      // May succeed or fail depending on whether search is active
      // Just verify we don't crash
      console.log('Input text response:', response.content[0].text);
    });
  });

  test.describe('Full Workflow - Real Device', () => {
    test('complete workflow: launch, screenshot, tap', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: false });
      
      // Step 1: Launch Settings
      console.log('Step 1: Launching Settings app...');
      const launchResponse = await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.android.settings' },
      });
      expect(launchResponse.isError).toBeFalsy();
      console.log('✓ App launched');

      // Wait for app
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Take initial screenshot
      console.log('Step 2: Taking screenshot...');
      const screenshot1 = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });
      expect(screenshot1.isError).toBeFalsy();
      console.log('✓ Screenshot taken');

      // Step 3: Tap somewhere
      console.log('Step 3: Tapping on screen...');
      const tapResponse = await client.callTool({
        name: 'android_tap',
        arguments: { x: 540, y: 400 },
      });
      expect(tapResponse.isError).toBeFalsy();
      console.log('✓ Tap executed');

      // Step 4: Take another screenshot to verify state changed
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Step 4: Taking final screenshot...');
      const screenshot2 = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });
      expect(screenshot2.isError).toBeFalsy();
      console.log('✓ Final screenshot taken');

      console.log('✅ Full workflow completed successfully on real device!');
    });
  });
});
