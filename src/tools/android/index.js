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

const { android_launch_app } = require('./android_launch_app');
const { android_tap } = require('./android_tap');
const { android_input_text } = require('./android_input_text');
const { android_screenshot } = require('./android_screenshot');
const {
  translateSelector,
  waitForElement,
  waitForUIStability,
  performActionWithWaits,
  DEFAULT_TIMEOUT,
} = require('./utils');

/**
 * Android tool definitions for MCP
 */
const androidToolDefinitions = [
  {
    name: 'android_launch_app',
    description: 'Launch an Android application by package name or APK path',
    inputSchema: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'Android package name (e.g., com.example.app)',
        },
        appPath: {
          type: 'string',
          description: 'Path to APK file to install and launch',
        },
      },
    },
  },
  {
    name: 'android_tap',
    description: 'Tap on an element or coordinates on Android',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Playwright-style selector for the element to tap',
        },
        x: {
          type: 'number',
          description: 'X coordinate for tap (use with y)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate for tap (use with x)',
        },
      },
    },
  },
  {
    name: 'android_input_text',
    description: 'Input text into an element on Android',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Playwright-style selector for the input element',
        },
        text: {
          type: 'string',
          description: 'Text to input',
        },
        clear: {
          type: 'boolean',
          description: 'Whether to clear existing text before input',
          default: false,
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'android_screenshot',
    description: 'Take a screenshot on Android',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to save the screenshot file',
        },
        selector: {
          type: 'string',
          description: 'Selector for element screenshot (optional)',
        },
      },
    },
  },
];

/**
 * Map of tool names to their handler functions
 */
const androidToolHandlers = {
  android_launch_app,
  android_tap,
  android_input_text,
  android_screenshot,
};

/**
 * Handle an Android tool call
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} params - Tool parameters
 * @returns {Promise<Object>} Tool result
 */
async function handleAndroidTool(toolName, params) {
  const handler = androidToolHandlers[toolName];

  if (!handler) {
    throw new Error(`Unknown Android tool: ${toolName}`);
  }

  return await handler(params);
}

/**
 * Check if a tool name is an Android tool
 *
 * @param {string} toolName - Name of the tool
 * @returns {boolean} True if it's an Android tool
 */
function isAndroidTool(toolName) {
  return toolName in androidToolHandlers;
}

module.exports = {
  android_launch_app,
  android_tap,
  android_input_text,
  android_screenshot,
  androidToolDefinitions,
  androidToolHandlers,
  handleAndroidTool,
  isAndroidTool,
  translateSelector,
  waitForElement,
  waitForUIStability,
  performActionWithWaits,
  DEFAULT_TIMEOUT,
};
