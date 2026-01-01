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

test.describe('Android Tools', () => {
  test.describe('Tool Registration', () => {
    test('Android tools are listed in available tools', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const { tools } = await client.listTools();
      const toolNames = tools.map((t: { name: string }) => t.name);

      expect(toolNames).toContain('android_launch_app');
      expect(toolNames).toContain('android_tap');
      expect(toolNames).toContain('android_input_text');
      expect(toolNames).toContain('android_screenshot');
    });

    test('web tools still work without target parameter', async ({ client, server }) => {
      server.setContent('/', '<title>Test</title><button>Click Me</button>', 'text/html');

      const response = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: server.PREFIX },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain(server.PREFIX);
    });
  });

  test.describe('android_launch_app', () => {
    test('launches app by package name', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_launch_app',
        arguments: { packageName: 'com.example.app' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Successfully launched app');
      expect(response.content[0].text).toContain('com.example.app');
    });

    test('launches app by APK path', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_launch_app',
        arguments: { appPath: '/path/to/app.apk' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Successfully launched app');
    });

    test('errors when neither packageName nor appPath provided', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_launch_app',
        arguments: {},
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('requires either packageName or appPath');
    });
  });

  test.describe('android_tap', () => {
    test('taps element by selector', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: '#submit-button' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Tapped element');
    });

    test('taps at coordinates', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { x: 100, y: 200 },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Tapped at coordinates (100, 200)');
    });

    test('taps element by text selector', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: 'text=Submit' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Tapped element');
    });

    test('taps element by data-testid selector', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: '[data-testid="login-btn"]' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Tapped element');
    });

    test('errors when neither selector nor coordinates provided', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: {},
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('requires either selector or (x, y) coordinates');
    });
  });

  test.describe('android_input_text', () => {
    test('inputs text into element', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_input_text',
        arguments: { selector: '#username', text: 'testuser' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Input text into');
    });

    test('clears and inputs text when clear=true', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_input_text',
        arguments: { selector: '#password', text: 'newpassword', clear: true },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Input text into');
    });

    test('errors when selector is missing', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_input_text',
        arguments: { text: 'test' },
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('requires selector parameter');
    });

    test('errors when text is missing', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_input_text',
        arguments: { selector: '#username' },
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('requires text parameter');
    });
  });

  test.describe('android_screenshot', () => {
    test('takes full screen screenshot', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_screenshot',
        arguments: {},
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Screenshot captured');
      // Check for image content
      expect(response.content).toHaveLength(2);
      expect(response.content[1].type).toBe('image');
    });

    test('takes element screenshot', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_screenshot',
        arguments: { selector: '#logo' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content[0].text).toContain('Screenshot captured');
    });
  });

  test.describe('Selector Translation', () => {
    test('translates ID selector correctly', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      // This tests that the selector translation is working by invoking the tap
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: '#login' },
      });

      expect(response.isError).toBeFalsy();
    });

    test('translates class selector correctly', async ({ startClient }) => {
      const { client } = await startClient({ androidMock: true });
      const response = await client.callTool({
        name: 'android_tap',
        arguments: { selector: '.button' },
      });

      expect(response.isError).toBeFalsy();
    });
  });
});

// Unit tests for selector translation function
test.describe('Selector Translation Unit Tests', () => {
  // Using require here because utils.js is a CommonJS module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { translateSelector } = require('../src/tools/android/utils');

  test('translates ID selector to accessibility ID', () => {
    expect(translateSelector('#login')).toBe('~login');
    expect(translateSelector('#submit-button')).toBe('~submit-button');
  });

  test('translates data-testid to accessibility ID', () => {
    expect(translateSelector('[data-testid="submit"]')).toBe('~submit');
    expect(translateSelector('[data-testid=\'login-btn\']')).toBe('~login-btn');
  });

  test('translates text selector to XPath with accessibility fallback', () => {
    // Text selectors now include content-desc fallback for better mobile support
    expect(translateSelector('text=Submit')).toBe("//*[@text='Submit' or @content-desc='Submit']");
    expect(translateSelector('text=Click Here')).toBe("//*[@text='Click Here' or @content-desc='Click Here']");
  });

  test('translates class selector to XPath', () => {
    expect(translateSelector('.button')).toBe("//*[contains(@class, 'button')]");
    expect(translateSelector('.submit-btn')).toBe("//*[contains(@class, 'submit-btn')]");
  });

  test('translates role:has-text selector to XPath', () => {
    expect(translateSelector('button:has-text("Next")')).toBe("//android.widget.Button[@text='Next' or @content-desc='Next']");
    expect(translateSelector('input:has-text("Search")')).toBe("//android.widget.EditText[@text='Search' or @content-desc='Search']");
  });

  test('throws error for empty selector', () => {
    expect(() => translateSelector('')).toThrow('Selector is required');
    expect(() => translateSelector(null as any)).toThrow('Selector is required');
    expect(() => translateSelector(undefined as any)).toThrow('Selector is required');
  });
});
