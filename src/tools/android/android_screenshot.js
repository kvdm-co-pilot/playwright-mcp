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

/** Take a screenshot of screen or element. */
async function android_screenshot(params = {}) {
  const { path: screenshotPath, selector, timeout = DEFAULT_TIMEOUT } = params;

  try {
    const driver = await getAppiumDriver();

    let screenshot;
    if (selector) {
      const androidSelector = translateSelector(selector);
      const element = await waitForElement(driver, androidSelector, { timeout });
      screenshot = await element.takeScreenshot();
    } else {
      screenshot = await driver.takeScreenshot();
    }

    if (screenshotPath) {
      const fullPath = path.resolve(screenshotPath);
      fs.writeFileSync(fullPath, screenshot, 'base64');

      return {
        content: [{
          type: 'text',
          text: `### Result\nScreenshot saved to: ${fullPath}`,
        }],
      };
    } else {
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
    if (error.message.includes('Timeout')) {
      throw new Error(`Timed out waiting for element "${selector}" to be visible on mobile target. ${error.message}`);
    }
    throw new Error(`Failed to take screenshot: ${error.message}`);
  }
}

module.exports = { android_screenshot };
