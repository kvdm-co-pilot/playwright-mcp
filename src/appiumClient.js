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

const { remote } = require('webdriverio');

let driver = null;

/**
 * Create a mock Appium driver for testing
 * @returns {Object} Mock driver object
 */
function createMockDriver() {
  const mockElement = {
    isDisplayed: async () => true,
    isEnabled: async () => true,
    click: async () => {},
    clearValue: async () => {},
    setValue: async () => {},
    takeScreenshot: async () => 'bW9ja19lbGVtZW50X3NjcmVlbnNob3Q=',
    // Appium-style wait methods
    waitForExist: async () => true,
    waitForDisplayed: async () => true,
    waitForEnabled: async () => true,
  };

  return {
    installApp: async () => {},
    activateApp: async () => {},
    pause: async () => {},
    $: async () => mockElement,
    touchAction: async () => {},
    takeScreenshot: async () => 'bW9ja19zY3JlZW5zaG90X2RhdGE=',
    deleteSession: async () => {},
  };
}

/**
 * Check if mock mode is enabled via environment variable
 * @returns {boolean}
 */
function isMockMode() {
  return process.env.PLAYWRIGHT_MCP_ANDROID_MOCK === '1';
}

/**
 * Get or create an Appium driver connection
 * @returns {Promise<Object>} WebdriverIO driver instance
 */
async function getAppiumDriver() {
  // Use mock driver in test mode
  if (isMockMode()) {
    if (!driver) {
      driver = createMockDriver();
    }
    return driver;
  }

  if (driver) {
    return driver;
  }

  const appiumUrl = process.env.APPIUM_URL || 'http://localhost:4723';

  const options = {
    protocol: 'http',
    hostname: new URL(appiumUrl).hostname,
    port: parseInt(new URL(appiumUrl).port) || 4723,
    path: '/wd/hub',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE || 'Android Emulator',
      'appium:avd': process.env.ANDROID_AVD,
      'appium:noReset': true,
    },
    logLevel: 'error',
  };

  try {
    driver = await remote(options);
    return driver;
  } catch (error) {
    throw new Error(`Failed to connect to Appium: ${error.message}`);
  }
}

/**
 * Close the Appium driver session
 */
async function closeAppiumDriver() {
  if (driver) {
    await driver.deleteSession();
    driver = null;
  }
}

module.exports = { getAppiumDriver, closeAppiumDriver, isMockMode };
