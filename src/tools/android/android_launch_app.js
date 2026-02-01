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

/** Launch an Android app by package name or APK path. */
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
