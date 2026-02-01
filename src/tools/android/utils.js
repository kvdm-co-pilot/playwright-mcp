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
 * Default timeout matching Playwright's default action timeout
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Polling interval for element waits (follows Playwright patterns)
 */
const POLL_INTERVAL = 200;

/**
 * Default timeout for waitForEnabled check
 * Shorter than main timeout since element might be intentionally disabled
 */
const ENABLED_CHECK_TIMEOUT = 5000;

/**
 * Default UI stability wait time for animations
 * This is internal - agents never see this
 */
const UI_STABILITY_TIMEOUT = 500;

/** Translates Playwright-style selectors to Android/Appium selectors. */
function translateSelector(playwrightSelector) {
  if (!playwrightSelector) {
    throw new Error('Selector is required');
  }

  // text=Value -> XPath text match
  if (playwrightSelector.startsWith('text=')) {
    const text = playwrightSelector.slice(5);
    return `//*[@text='${text}' or @content-desc='${text}']`;
  }

  // [data-testid="value"] -> accessibility ID
  const testIdMatch = playwrightSelector.match(/\[data-testid=["']([^"']+)["']\]/);
  if (testIdMatch) {
    return `~${testIdMatch[1]}`;
  }

  // #id -> accessibility ID
  if (playwrightSelector.startsWith('#')) {
    return `~${playwrightSelector.slice(1)}`;
  }

  // role:has-text("text") -> XPath
  const roleTextMatch = playwrightSelector.match(/^(\w+):has-text\(["']([^"']+)["']\)$/);
  if (roleTextMatch) {
    const [, role, text] = roleTextMatch;
    const roleMap = {
      'button': 'android.widget.Button',
      'input': 'android.widget.EditText',
      'textbox': 'android.widget.EditText',
      'link': 'android.widget.TextView',
      'heading': 'android.widget.TextView',
    };
    const androidClass = roleMap[role.toLowerCase()];
    if (androidClass) {
      return `//${androidClass}[@text='${text}' or @content-desc='${text}']`;
    }
    return `//*[@text='${text}' or @content-desc='${text}']`;
  }

  // .class -> XPath class contains
  if (playwrightSelector.startsWith('.')) {
    return `//*[contains(@class, '${playwrightSelector.slice(1)}')]`;
  }

  // [attr="value"] -> XPath
  const attrMatch = playwrightSelector.match(/^\[([^=]+)=["']([^"']+)["']\]$/);
  if (attrMatch) {
    return `//*[@${attrMatch[1]}='${attrMatch[2]}']`;
  }

  // Fallback: treat as accessibility ID
  return `~${playwrightSelector}`;
}

/** Waits for element using Appium's native wait capabilities. */
async function waitForElement(driver, selector, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, state = 'visible' } = options;

  try {
    const element = await driver.$(selector);
    await element.waitForExist({ timeout });

    if (state === 'visible') {
      await element.waitForDisplayed({ timeout });
    }

    if (state === 'visible') {
      try {
        await element.waitForEnabled({ timeout: Math.min(timeout, ENABLED_CHECK_TIMEOUT) });
      } catch (e) {
        // Element may be visible but disabled
      }
    }

    return element;
  } catch (error) {
    throw new Error(
        `Timeout ${timeout}ms exceeded waiting for selector "${selector}".`
    );
  }
}

/** Short pause for UI animations to settle after actions. */
async function waitForUIStability(driver, stabilityTimeout = UI_STABILITY_TIMEOUT) {
  await driver.pause(stabilityTimeout);
}

/** Performs action with automatic waits before and after. */
async function performActionWithWaits(driver, selector, action, options = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;
  const androidSelector = translateSelector(selector);
  const element = await waitForElement(driver, androidSelector, { timeout });
  const result = await action(element);
  await waitForUIStability(driver);
  return result;
}

module.exports = {
  translateSelector,
  waitForElement,
  waitForUIStability,
  performActionWithWaits,
  DEFAULT_TIMEOUT,
  POLL_INTERVAL,
};
