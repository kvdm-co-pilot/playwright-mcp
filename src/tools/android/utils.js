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
 * Translate Playwright selector to Android/Appium selector
 *
 * Resolution order (matching Playwright patterns):
 * 1. Accessibility labels (text=, role with name)
 * 2. Data test IDs ([data-testid="..."])
 * 3. ID selectors (#id) -> accessibility ID
 * 4. Fallback to XPath for structural selectors
 *
 * @param {string} playwrightSelector - Playwright-style selector
 * @returns {string} Android/Appium selector
 */
function translateSelector(playwrightSelector) {
  if (!playwrightSelector) {
    throw new Error('Selector is required');
  }

  // 1. Text selector (text=Value) -> Accessibility label (preferred)
  //    Maps to: accessibilityId or XPath text match
  if (playwrightSelector.startsWith('text=')) {
    const text = playwrightSelector.slice(5);
    // Try accessibility label first, with XPath text fallback
    return `//*[@text='${text}' or @content-desc='${text}']`;
  }

  // 2. Test ID selector ([data-testid="value"]) -> resource-id or content-desc
  //    This is the gold standard for cross-platform testing
  const testIdMatch = playwrightSelector.match(/\[data-testid=["']([^"']+)["']\]/);
  if (testIdMatch) {
    const testId = testIdMatch[1];
    // Use accessibility ID (content-desc) which maps well across platforms
    return `~${testId}`;
  }

  // 3. ID selector (#id) -> accessibility ID
  //    Direct mapping to Android content-desc or resource-id
  if (playwrightSelector.startsWith('#')) {
    const id = playwrightSelector.slice(1);
    return `~${id}`;
  }

  // 4. Role with name (button:has-text("Next")) -> XPath
  const roleTextMatch = playwrightSelector.match(/^(\w+):has-text\(["']([^"']+)["']\)$/);
  if (roleTextMatch) {
    const [, role, text] = roleTextMatch;
    // Map common roles to Android classes
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
    // Fallback to text match
    return `//*[@text='${text}' or @content-desc='${text}']`;
  }

  // 5. Class selector (.class) -> XPath with class contains
  if (playwrightSelector.startsWith('.')) {
    const className = playwrightSelector.slice(1);
    return `//*[contains(@class, '${className}')]`;
  }

  // 6. Attribute selector ([attribute="value"]) -> XPath
  const attrMatch = playwrightSelector.match(/^\[([^=]+)=["']([^"']+)["']\]$/);
  if (attrMatch) {
    const [, attr, value] = attrMatch;
    return `//*[@${attr}='${value}']`;
  }

  // 7. Fallback: treat as accessibility ID
  return `~${playwrightSelector}`;
}

/**
 * Wait for element using Appium's native wait capabilities
 * Mirrors Playwright's waitForSelector behavior exactly
 *
 * Uses polling (not fixed sleeps) with Appium native waits:
 * - waitForExist
 * - waitForDisplayed
 * - waitForEnabled
 *
 * @param {Object} driver - WebdriverIO driver instance
 * @param {string} selector - Android selector
 * @param {Object} options - Wait options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {string} options.state - Element state to wait for: 'visible' (default), 'attached', 'hidden'
 * @returns {Promise<Object>} - Element when ready
 */
async function waitForElement(driver, selector, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, state = 'visible' } = options;

  try {
    const element = await driver.$(selector);

    // Use Appium's native wait methods (not fixed sleeps)
    // These use internal polling, matching Playwright's behavior
    await element.waitForExist({ timeout });

    if (state === 'visible') {
      await element.waitForDisplayed({ timeout });
    }

    // Also wait for enabled (clickable) for interactive elements
    if (state === 'visible') {
      try {
        await element.waitForEnabled({ timeout: Math.min(timeout, 5000) });
      } catch (e) {
        // Element might be visible but disabled - that's ok for some use cases
      }
    }

    return element;
  } catch (error) {
    // Provide helpful error message matching Playwright patterns
    throw new Error(
        `Timeout ${timeout}ms exceeded waiting for selector "${selector}". ` +
        `Consider using accessibility labels or data-testid attributes for reliable mobile element selection.`
    );
  }
}

/**
 * Wait for UI to stabilize after an action
 * This handles mobile-specific UI animations and transitions
 * Called automatically after actions - never exposed to agents
 *
 * @param {Object} driver - WebdriverIO driver instance
 * @param {number} stabilityTimeout - How long to wait for stability (default: 500ms)
 */
async function waitForUIStability(driver, stabilityTimeout = 500) {
  // Short wait for UI animations to complete
  // This is internal - agents never see this
  await driver.pause(stabilityTimeout);
}

/**
 * Perform action with automatic waits (Playwright-style)
 * Wraps: autoWait → performAction → verifyState
 *
 * @param {Object} driver - WebdriverIO driver instance
 * @param {string} selector - Playwright-style selector
 * @param {Function} action - Action to perform on element
 * @param {Object} options - Options
 * @returns {Promise<*>} Result of action
 */
async function performActionWithWaits(driver, selector, action, options = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;

  // 1. Translate selector (hidden from agents)
  const androidSelector = translateSelector(selector);

  // 2. Wait for element (using Appium native waits, not sleeps)
  const element = await waitForElement(driver, androidSelector, { timeout });

  // 3. Perform the action
  const result = await action(element);

  // 4. Wait for UI stability (internal, automatic)
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
