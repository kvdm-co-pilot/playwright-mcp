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

const { checkHealth, ensureReady, listAvailableEmulators } = require('../../androidHealth');

module.exports = {
  definition: {
    name: 'android_health',
    description: 'Check the health status of Android automation infrastructure. Returns whether Appium server is running, whether an Android device/emulator is connected, and provides recommendations if there are issues. Can automatically start services if requested.',
    inputSchema: {
      type: 'object',
      properties: {
        autoStart: {
          type: 'boolean',
          description: 'If true, automatically start Appium server and emulator if not running. Default: true for convenience.',
          default: true
        },
        verbose: {
          type: 'boolean',
          description: 'Include detailed information about connected devices and available emulators',
          default: false
        }
      }
    }
  },

  async handler(args = {}) {
    const { autoStart = true, verbose = false } = args;
    const statusMessages = [];
    
    try {
      let health;
      let actions = [];
      
      if (autoStart) {
        const result = await ensureReady({
          autoStart: true,
          throwOnError: false,
          onStatus: (msg) => statusMessages.push(msg)
        });
        health = result.health;
        actions = result.actions;
      } else {
        health = await checkHealth(true);
      }
      
      let output = '# Android Infrastructure Health\n\n';
      
      if (statusMessages.length > 0) {
        output += '## Startup Log\n\n```\n';
        statusMessages.forEach(msg => output += `${msg}\n`);
        output += '```\n\n';
      }
      
      if (autoStart && actions.length > 0) {
        output += '## Actions Taken\n\n';
        actions.forEach(action => output += `- ${action}\n`);
        output += '\n';
      }
      
      const appiumIcon = health.appiumRunning ? '✅' : '❌';
      const deviceIcon = health.emulatorRunning ? '✅' : '❌';
      const overallIcon = health.healthy ? '✅' : '❌';
      
      output += `## Overall Status: ${overallIcon} ${health.healthy ? 'Ready' : 'Not Ready'}\n\n`;
      
      output += '### Components\n\n';
      output += `| Component | Status | Details |\n`;
      output += `|-----------|--------|---------|` + '\n';
      output += `| Appium Server | ${appiumIcon} ${health.appiumRunning ? 'Running' : 'Not Running'} | ${health.appiumVersion ? `v${health.appiumVersion}` : health.error?.split(';')[0] || 'N/A'} |\n`;
      output += `| Android Device | ${deviceIcon} ${health.emulatorRunning ? 'Connected' : 'Not Connected'} | ${health.deviceId || 'N/A'} |\n`;
      
      if (health.deviceType) {
        output += `\n**Device Type:** ${health.deviceType}`;
        if (health.deviceModel) {
          output += ` (${health.deviceModel})`;
        }
        output += '\n';
      }
      
      if (verbose || !health.emulatorRunning) {
        const emulators = await listAvailableEmulators();
        if (emulators.length > 0) {
          output += '\n### Available Emulators\n\n';
          emulators.forEach(emu => output += `- \`${emu}\`\n`);
        }
      }
      
      if (!health.healthy && health.recommendations?.length > 0) {
        output += '\n### Recommendations\n\n';
        health.recommendations.forEach((rec, i) => output += `${i + 1}. ${rec}\n`);
        
        if (!autoStart) {
          output += '\n💡 **Tip:** Call with `autoStart: true` to automatically start services.\n';
        }
      }
      
      if (!health.healthy) {
        output += '\n### Quick Fix Commands\n\n```bash\n';
        if (!health.appiumRunning) {
          output += '# Start Appium server\n';
          output += 'appium &\n\n';
        }
        if (!health.emulatorRunning) {
          output += '# List available emulators\n';
          output += 'emulator -list-avds\n\n';
          output += '# Start an emulator (replace AVD_NAME)\n';
          output += 'emulator -avd AVD_NAME &\n';
        }
        output += '```\n';
      }
      
      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
      
    } catch (error) {
      let errorOutput = '# Android Health Check Failed\n\n';
      
      if (statusMessages.length > 0) {
        errorOutput += '## Progress Before Error\n\n';
        statusMessages.forEach(msg => errorOutput += `- ${msg}\n`);
        errorOutput += '\n';
      }
      
      errorOutput += `❌ **Error:** ${error.message}\n\n`;
      errorOutput += 'This usually means the health check module encountered an unexpected error.\n';
      errorOutput += 'Please ensure Android SDK is properly installed and ANDROID_HOME is set.';
      
      return {
        content: [{
          type: 'text',
          text: errorOutput
        }],
        isError: true
      };
    }
  }
};
