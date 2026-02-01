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
const { ensureReady, checkHealth, resetHealthCache, setStatusCallback } = require('./androidHealth');

let driver = null;
let sessionDeviceId = null; // Track which device the session is for

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
    getPageSource: async () => '<hierarchy></hierarchy>',
    getWindowSize: async () => ({ width: 1080, height: 2400 }),
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
 * Automatically starts Appium server and emulator if not running
 * 
 * @param {Object} options
 * @param {function(string): void} options.onStatus - Callback for status updates
 * @returns {Promise<Object>} WebdriverIO driver instance
 */
async function getAppiumDriver(options = {}) {
  const { onStatus } = options;
  
  // Use mock driver in test mode
  if (isMockMode()) {
    if (!driver) {
      driver = createMockDriver();
    }
    return driver;
  }

  // Set up status callback if provided
  if (onStatus) {
    setStatusCallback(onStatus);
  }

  // Ensure infrastructure is ready (auto-starts Appium and emulator)
  const { health, actions } = await ensureReady({ 
    autoStart: true, 
    throwOnError: true,
    onStatus
  });
  
  // Log what we did
  if (actions.length > 0) {
    console.error('[AppiumClient] Infrastructure setup:', actions.join(', '));
  }
  
  // If we have an existing session, verify it's still valid
  if (driver) {
    // Check if device changed
    if (sessionDeviceId && sessionDeviceId !== health.deviceId) {
      console.error('[AppiumClient] Device changed, creating new session');
      await closeAppiumDriver();
    } else {
      // Try to verify session is still active
      try {
        await driver.getPageSource();
        return driver;
      } catch (e) {
        console.error('[AppiumClient] Session invalid, creating new session');
        driver = null;
        sessionDeviceId = null;
      }
    }
  }

  const appiumUrl = process.env.APPIUM_URL || 'http://localhost:4723';

  const options_ = {
    protocol: 'http',
    hostname: new URL(appiumUrl).hostname,
    port: parseInt(new URL(appiumUrl).port) || 4723,
    path: '/',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': health.deviceId || process.env.ANDROID_DEVICE || 'Android Emulator',
      'appium:udid': health.deviceId,
      'appium:noReset': true,
      'appium:newCommandTimeout': 300,
    },
    logLevel: 'error',
    connectionRetryTimeout: 60000,
    connectionRetryCount: 3,
  };

  try {
    if (onStatus) onStatus('Connecting to Appium...');
    driver = await remote(options_);
    sessionDeviceId = health.deviceId;
    if (onStatus) onStatus('Connected to device');
    return driver;
  } catch (error) {
    resetHealthCache();
    throw new Error(`Failed to connect to Appium: ${error.message}`);
  }
}

/**
 * Close the Appium driver session
 */
async function closeAppiumDriver() {
  if (driver) {
    try {
      await driver.deleteSession();
    } catch (e) {
      // Ignore errors on cleanup
    }
    driver = null;
    sessionDeviceId = null;
  }
}

/**
 * Get the current health status of Android infrastructure
 * @returns {Promise<Object>} Health status
 */
async function getHealthStatus() {
  if (isMockMode()) {
    return {
      healthy: true,
      appiumRunning: true,
      emulatorRunning: true,
      appiumVersion: 'mock',
      deviceId: 'mock-device',
      deviceType: 'emulator'
    };
  }
  return checkHealth();
}

module.exports = { 
  getAppiumDriver, 
  closeAppiumDriver, 
  isMockMode,
  getHealthStatus,
  resetHealthCache
};
