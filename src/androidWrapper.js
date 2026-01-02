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

const { androidToolDefinitions, handleAndroidTool, isAndroidTool } = require('./tools/android');

// Store the original method
let _originalSetRequestHandler = null;
let _injected = false;

/**
 * Extract method string from MCP SDK schema
 * The SDK uses Zod schemas with specific structure
 *
 * @param {Object} schema - Zod schema object
 * @returns {string|null} Method string or null
 */
function extractMethodFromSchema(schema) {
  try {
    // Primary path: schema.def.shape.method.def.values[0]
    if (schema?.def?.shape?.method?.def?.values?.[0]) {
      return schema.def.shape.method.def.values[0];
    }

    // Fallback for older Zod versions: _def structure
    if (schema?._def?.shape?.method?._def?.value) {
      return schema._def.shape.method._def.value;
    }

    // Another fallback: direct access
    if (schema?.shape?.method?.def?.values?.[0]) {
      return schema.shape.method.def.values[0];
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Inject Android tools support into the MCP server
 *
 * IMPORTANT: This patches the Playwright bundled MCP Server class.
 * This approach is necessary because Playwright bundles its own copy of the
 * MCP SDK, which means we cannot patch the npm @modelcontextprotocol/sdk module.
 *
 * RISK: This patching approach may break with future Playwright updates if:
 * - The bundled module path changes
 * - The Server class API changes
 * - The setRequestHandler method signature changes
 *
 * MITIGATION: If patching fails, the server will continue to work with web
 * tools only. Android tools will be unavailable but web automation remains
 * fully functional.
 */
function injectAndroidTools() {
  if (_injected) {
    return;
  }

  try {
    // IMPORTANT: Patch the Playwright BUNDLED MCP module, not the npm module
    // Playwright bundles its own copy of the MCP SDK at this path
    // This path may change in future Playwright versions
    const mcpBundle = require('playwright-core/lib/mcpBundle');
    const Server = mcpBundle.Server;

    if (!Server) {
      // Server class not found - Playwright API may have changed
      console.error('[android-wrapper] Warning: Could not find Server class in mcpBundle. Android tools will not be available.');
      console.error('[android-wrapper] This may be due to a Playwright version incompatibility.');
      return;
    }

    // Store the original setRequestHandler method
    _originalSetRequestHandler = Server.prototype.setRequestHandler;

    // Patch the setRequestHandler method on the prototype
    Server.prototype.setRequestHandler = function(schema, handler) {
      // Extract method from schema
      const method = extractMethodFromSchema(schema);

      // Debug logging
      if (process.env.PWMCP_ANDROID_DEBUG) {
        console.error(`[android-wrapper] setRequestHandler called with method: ${method}`);
      }

      // Intercept tools/list handler
      if (method === 'tools/list') {
        if (process.env.PWMCP_ANDROID_DEBUG) {
          console.error(`[android-wrapper] Intercepting tools/list handler`);
        }
        const originalHandler = handler;
        handler = async (request, extra) => {
          const result = await originalHandler(request, extra);
          // Add Android tools to the list
          if (result && result.tools) {
            if (process.env.PWMCP_ANDROID_DEBUG) {
              console.error(`[android-wrapper] Adding ${androidToolDefinitions.length} Android tools`);
            }
            result.tools = [...result.tools, ...androidToolDefinitions];
          }
          return result;
        };
      }

      // Intercept tools/call handler
      if (method === 'tools/call') {
        if (process.env.PWMCP_ANDROID_DEBUG) {
          console.error(`[android-wrapper] Intercepting tools/call handler`);
        }
        const originalHandler = handler;
        handler = async (request, extra) => {
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
          return await originalHandler(request, extra);
        };
      }

      return _originalSetRequestHandler.call(this, schema, handler);
    };

    _injected = true;

    if (process.env.PWMCP_ANDROID_DEBUG) {
      console.error('[android-wrapper] Successfully injected Android tools support');
    }
  } catch (error) {
    // If injection fails, the server will continue working with web tools only
    // Android tools will not be available, but this is not a fatal error
    console.error('[android-wrapper] Warning: Failed to inject Android tools:', error.message);
    console.error('[android-wrapper] Web automation will continue to work. Android tools will not be available.');
    console.error('[android-wrapper] This may be due to a Playwright version incompatibility.');
  }
}

/**
 * Restore the original Server class (for testing)
 */
function restoreOriginalServer() {
  if (_originalSetRequestHandler && _injected) {
    try {
      const mcpBundle = require('playwright-core/lib/mcpBundle');
      mcpBundle.Server.prototype.setRequestHandler = _originalSetRequestHandler;
      _injected = false;
    } catch (error) {
      // Ignore restore errors
    }
  }
}

/**
 * Check if Android tools have been injected
 */
function isInjected() {
  return _injected;
}

module.exports = {
  injectAndroidTools,
  restoreOriginalServer,
  isInjected,
};
