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

const { getAppiumDriver } = require('../../appiumClient');
const { translateSelector, waitForElement, DEFAULT_TIMEOUT } = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * Take a screenshot on Android
 * Mirrors Playwright's screenshot() behavior
 *
 * @param {Object} params - Parameters
 * @param {string} [params.path] - Path to save the screenshot
 * @param {string} [params.selector] - Selector for element screenshot
 * @param {number} [params.timeout] - Timeout for element wait (default: 30000)
 * @returns {Promise<Object>} Result with screenshot data
 */
async function android_screenshot(params = {}) {
  const { path: screenshotPath, selector, timeout = DEFAULT_TIMEOUT } = params;

  try {
    const driver = await getAppiumDriver();

    let screenshot;
    if (selector) {
      // Element screenshot - wait for element first (Playwright-style)
      const androidSelector = translateSelector(selector);
      const element = await waitForElement(driver, androidSelector, { timeout });
      screenshot = await element.takeScreenshot();
    } else {
      // Full screen screenshot
      screenshot = await driver.takeScreenshot();
    }

    if (screenshotPath) {
      // Save to file
      const fullPath = path.resolve(screenshotPath);
      fs.writeFileSync(fullPath, screenshot, 'base64');

      return {
        content: [{
          type: 'text',
          text: `### Result\nScreenshot saved to: ${fullPath}`,
        }],
      };
    } else {
      // Return base64 (matches Playwright's screenshot response format)
      return {
        content: [
          {
            type: 'text',
            text: '### Result\nScreenshot captured',
          },
          {
            type: 'image',
            data: screenshot,
            mimeType: 'image/png',
          },
        ],
      };
    }
  } catch (error) {
    // Match Playwright error message patterns
    if (error.message.includes('Timeout')) {
      throw new Error(`Timed out waiting for element "${selector}" to be visible on mobile target. ${error.message}`);
    }
    throw new Error(`Failed to take screenshot: ${error.message}`);
  }
}

module.exports = { android_screenshot };
