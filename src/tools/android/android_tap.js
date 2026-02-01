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
const { translateSelector, waitForElement, waitForUIStability, DEFAULT_TIMEOUT } = require('./utils');

/** Tap on an element or coordinates. */
async function android_tap(params) {
  const { selector, x, y, timeout = DEFAULT_TIMEOUT } = params;

  if (!selector && (x === undefined || y === undefined)) {
    throw new Error('android_tap requires either selector or (x, y) coordinates');
  }

  try {
    const driver = await getAppiumDriver();

    if (x !== undefined && y !== undefined) {
      await driver.action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ x: Math.round(x), y: Math.round(y) })
        .down()
        .up()
        .perform();

      await waitForUIStability(driver);

      return {
        content: [{
          type: 'text',
          text: `### Result\nTapped at coordinates (${x}, ${y})`,
        }],
      };
    } else {
      const androidSelector = translateSelector(selector);
      const element = await waitForElement(driver, androidSelector, { timeout });
      await element.click();
      await waitForUIStability(driver);

      return {
        content: [{
          type: 'text',
          text: `### Result\nTapped element: ${selector}`,
        }],
      };
    }
  } catch (error) {
    if (error.message.includes('Timeout')) {
      throw new Error(`Timed out waiting for element "${selector}" to be visible on mobile target. ${error.message}`);
    }
    throw new Error(`Failed to tap: ${error.message}`);
  }
}

module.exports = { android_tap };
