#!/usr/bin/env node
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

const { createConnection: createPlaywrightConnection } = require('playwright/lib/mcp/index');
const { androidToolDefinitions, handleAndroidTool, isAndroidTool } = require('./src/tools/android');
const { getAppiumDriver, closeAppiumDriver } = require('./src/appiumClient');

/**
 * Create an MCP connection with Android tool support
 *
 * @param {Object} config - Configuration options
 * @param {Function} contextGetter - Optional function to get browser context
 * @returns {Promise<Object>} MCP server instance with Android support
 */
async function createConnection(config, contextGetter) {
  const server = await createPlaywrightConnection(config, contextGetter);

  // Get the original handlers from the Map
  const originalToolsListHandler = server._requestHandlers.get('tools/list');
  const originalToolsCallHandler = server._requestHandlers.get('tools/call');

  // Wrap the tools/list handler to include Android tools
  if (originalToolsListHandler) {
    server._requestHandlers.set('tools/list', async (request, extra) => {
      const result = await originalToolsListHandler(request, extra);
      // Add Android tools to the list
      result.tools = [...result.tools, ...androidToolDefinitions];
      return result;
    });
  }

  // Wrap the tools/call handler to route Android tools
  if (originalToolsCallHandler) {
    server._requestHandlers.set('tools/call', async (request, extra) => {
      const { name, arguments: args } = request.params;

      // Check if this is an Android tool
      if (isAndroidTool(name)) {
        try {
          return await handleAndroidTool(name, args || {});
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${error.message}`,
            }],
            isError: true,
          };
        }
      }

      // Otherwise, delegate to original Playwright handler
      return await originalToolsCallHandler(request, extra);
    });
  }

  return server;
}

module.exports = {
  createConnection,
  // Export Android utilities for programmatic use
  getAppiumDriver,
  closeAppiumDriver,
};
