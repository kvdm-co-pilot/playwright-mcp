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

/** Input text into an element. */
async function android_input_text(params) {
  const { selector, text, clear = false, timeout = DEFAULT_TIMEOUT } = params;

  if (!selector) {
    throw new Error('android_input_text requires selector parameter');
  }

  if (text === undefined || text === null) {
    throw new Error('android_input_text requires text parameter');
  }

  try {
    const driver = await getAppiumDriver();
    const androidSelector = translateSelector(selector);
    const element = await waitForElement(driver, androidSelector, { timeout });

    if (clear) await element.clearValue();
    await element.setValue(text);
    await waitForUIStability(driver);

    return {
      content: [{
        type: 'text',
        text: `### Result\nInput text into: ${selector}`,
      }],
    };
  } catch (error) {
    if (error.message.includes('Timeout')) {
      throw new Error(`Timed out waiting for element "${selector}" to be visible on mobile target. ${error.message}`);
    }
    throw new Error(`Failed to input text: ${error.message}`);
  }
}

module.exports = { android_input_text };
