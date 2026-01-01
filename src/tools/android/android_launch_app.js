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
const { waitForUIStability } = require('./utils');

/**
 * Launch an Android application
 * Automatic waits are built-in - agents don't need to add sleeps
 *
 * @param {Object} params - Parameters
 * @param {string} [params.packageName] - Android package name (e.g., 'com.example.app')
 * @param {string} [params.appPath] - Path to APK file
 * @returns {Promise<Object>} Result of the launch operation
 */
async function android_launch_app(params) {
  const { packageName, appPath } = params;

  if (!packageName && !appPath) {
    throw new Error('android_launch_app requires either packageName or appPath parameter');
  }

  try {
    const driver = await getAppiumDriver();

    if (appPath) {
      await driver.installApp(appPath);
    }

    if (packageName) {
      await driver.activateApp(packageName);

      // Wait for app to initialize and UI to stabilize
      // This is internal and automatic - agents don't need to know
      await waitForUIStability(driver, 2000);
    }

    return {
      content: [{
        type: 'text',
        text: `### Result\nSuccessfully launched app: ${packageName || appPath}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to launch Android app: ${error.message}`);
  }
}

module.exports = { android_launch_app };
