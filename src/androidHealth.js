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
 * Android Infrastructure Health Check & Auto-Start Module
 * 
 * Provides automatic infrastructure management:
 * 1. Service Discovery - Check if Appium server is reachable
 * 2. Device Discovery - Check if Android emulator/device is connected
 * 3. Auto-Start - Automatically start Appium and emulator if not running
 * 4. Status Reporting - Clear messages about what's happening
 * 5. Health Caching - Avoid excessive health checks
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const path = require('path');

const execAsync = promisify(exec);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Timeouts
  APPIUM_START_TIMEOUT_MS: 30000,      // Max time to wait for Appium to start
  EMULATOR_START_TIMEOUT_MS: 120000,   // Max time to wait for emulator to boot
  EMULATOR_BOOT_POLL_MS: 3000,         // How often to check if emulator is booted
  HEALTH_CHECK_CACHE_MS: 5000,         // Cache health status for this long
  
  // Retry settings
  MAX_APPIUM_START_ATTEMPTS: 3,
  MAX_EMULATOR_START_ATTEMPTS: 2,
};

// ============================================================================
// State
// ============================================================================

let lastHealthCheck = null;
let lastHealthCheckTime = 0;
let statusCallback = null; // For reporting status back to caller

/**
 * Set a callback to receive status updates during operations
 * @param {function(string): void} callback 
 */
function setStatusCallback(callback) {
  statusCallback = callback;
}

/**
 * Report status to callback and console
 * @param {string} message 
 */
function reportStatus(message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${message}`;
  console.error(formatted);
  if (statusCallback) {
    statusCallback(message);
  }
}

// ============================================================================
// Path Discovery
// ============================================================================

function getAdbPath() {
  const paths = [
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb'),
    path.join(process.env.HOME || '', 'Library/Android/sdk/platform-tools/adb'),
    path.join(process.env.HOME || '', 'Android/Sdk/platform-tools/adb'),
    '/usr/local/bin/adb',
    'adb',
  ].filter(Boolean);
  return paths;
}

function getEmulatorPath() {
  const paths = [
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'emulator', 'emulator'),
    path.join(process.env.HOME || '', 'Library/Android/sdk/emulator/emulator'),
    path.join(process.env.HOME || '', 'Android/Sdk/emulator/emulator'),
    '/usr/local/bin/emulator',
    'emulator',
  ].filter(Boolean);
  return paths;
}

function getAppiumPaths() {
  return [
    'appium',
    '/usr/local/bin/appium',
    '/opt/homebrew/bin/appium',
    path.join(process.env.HOME || '', '.npm-global/bin/appium'),
  ];
}

/**
 * Find first working executable from a list of paths
 */
async function findExecutable(paths, testArg = '--version') {
  for (const p of paths) {
    try {
      await execAsync(`"${p}" ${testArg}`, { timeout: 5000 });
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

// ============================================================================
// Health Checks
// ============================================================================

/**
 * Check if Appium server is running and reachable
 */
async function checkAppiumServer() {
  const appiumUrl = process.env.APPIUM_URL || 'http://localhost:4723';
  const url = new URL(appiumUrl);
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 4723,
      path: '/status',
      method: 'GET',
      timeout: 3000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          if (status.value && status.value.ready) {
            resolve({
              running: true,
              version: status.value.build?.version || 'unknown',
              error: null
            });
          } else {
            resolve({ running: false, version: null, error: 'Appium server not ready' });
          }
        } catch {
          resolve({ running: false, version: null, error: 'Invalid Appium response' });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ running: false, version: null, error: `Cannot connect: ${e.code || e.message}` });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false, version: null, error: 'Connection timeout' });
    });
    
    req.end();
  });
}

/**
 * Check if Android emulator or device is connected
 */
async function checkAndroidDevice() {
  const adbPath = await findExecutable(getAdbPath(), 'version');
  
  if (!adbPath) {
    return {
      connected: false,
      deviceId: null,
      deviceType: null,
      error: 'ADB not found. Set ANDROID_HOME environment variable.'
    };
  }
  
  try {
    const { stdout } = await execAsync(`"${adbPath}" devices -l`, { timeout: 5000 });
    const lines = stdout.trim().split('\n').slice(1);
    
    const devices = lines
      .filter(line => line.trim() && !line.includes('offline') && !line.includes('unauthorized'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const deviceId = parts[0];
        const isEmulator = deviceId.startsWith('emulator-');
        const model = line.match(/model:(\S+)/)?.[1] || 'unknown';
        return { deviceId, isEmulator, model, state: parts[1] };
      })
      .filter(d => d.state === 'device');
    
    if (devices.length === 0) {
      return { connected: false, deviceId: null, deviceType: null, error: 'No devices connected' };
    }
    
    // Prefer specified device, otherwise first available
    const targetDevice = process.env.ANDROID_DEVICE;
    let selected = devices[0];
    
    if (targetDevice) {
      const match = devices.find(d => 
        d.deviceId === targetDevice || 
        d.model.toLowerCase().includes(targetDevice.toLowerCase())
      );
      if (match) selected = match;
    }
    
    return {
      connected: true,
      deviceId: selected.deviceId,
      deviceType: selected.isEmulator ? 'emulator' : 'physical',
      model: selected.model,
      error: null
    };
  } catch (e) {
    return { connected: false, deviceId: null, deviceType: null, error: `ADB error: ${e.message}` };
  }
}

/**
 * List available Android emulators (AVDs)
 */
async function listAvailableEmulators() {
  const emulatorPath = await findExecutable(getEmulatorPath(), '-list-avds');
  if (!emulatorPath) return [];
  
  try {
    const { stdout } = await execAsync(`"${emulatorPath}" -list-avds`, { timeout: 5000 });
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================================================
// Auto-Start Services
// ============================================================================

/**
 * Start Appium server if not running
 * @returns {Promise<{started: boolean, message: string}>}
 */
async function startAppiumServer() {
  const status = await checkAppiumServer();
  if (status.running) {
    return { started: true, message: `Appium already running (v${status.version})` };
  }
  
  reportStatus('🚀 Starting Appium server...');
  
  const appiumPath = await findExecutable(getAppiumPaths(), '--version');
  if (!appiumPath) {
    return { 
      started: false, 
      message: 'Appium not found. Install with: npm install -g appium && appium driver install uiautomator2' 
    };
  }
  
  // Start Appium as detached process
  try {
    const appiumProcess = spawn(appiumPath, ['--log-level', 'error'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env }
    });
    appiumProcess.unref();
  } catch (e) {
    return { started: false, message: `Failed to spawn Appium: ${e.message}` };
  }
  
  // Wait for Appium to be ready
  const startTime = Date.now();
  let lastError = '';
  
  while (Date.now() - startTime < CONFIG.APPIUM_START_TIMEOUT_MS) {
    await sleep(1000);
    const check = await checkAppiumServer();
    
    if (check.running) {
      reportStatus(`✅ Appium started successfully (v${check.version})`);
      return { started: true, message: `Appium started (v${check.version})` };
    }
    lastError = check.error;
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    reportStatus(`⏳ Waiting for Appium... (${elapsed}s)`);
  }
  
  return { started: false, message: `Appium failed to start: ${lastError}` };
}

/**
 * Start an Android emulator if none running
 * @returns {Promise<{started: boolean, message: string, deviceId: string|null}>}
 */
async function startEmulator() {
  // First check if any device is already connected
  const deviceStatus = await checkAndroidDevice();
  if (deviceStatus.connected) {
    return { 
      started: true, 
      message: `Device already connected: ${deviceStatus.deviceId} (${deviceStatus.deviceType})`,
      deviceId: deviceStatus.deviceId
    };
  }
  
  reportStatus('📱 No Android device found. Attempting to start emulator...');
  
  // Find available emulators
  const emulators = await listAvailableEmulators();
  if (emulators.length === 0) {
    return { 
      started: false, 
      message: 'No emulators available. Create one in Android Studio AVD Manager.',
      deviceId: null
    };
  }
  
  // Use first available emulator (or one matching ANDROID_DEVICE env var)
  let avdName = emulators[0];
  const targetDevice = process.env.ANDROID_DEVICE;
  if (targetDevice) {
    const match = emulators.find(e => e.toLowerCase().includes(targetDevice.toLowerCase()));
    if (match) avdName = match;
  }
  
  reportStatus(`🚀 Starting emulator: ${avdName}`);
  
  const emulatorPath = await findExecutable(getEmulatorPath(), '-list-avds');
  if (!emulatorPath) {
    reportStatus('❌ Emulator command not found. Check ANDROID_HOME is set correctly.');
    return { started: false, message: 'Emulator command not found. Set ANDROID_HOME environment variable.', deviceId: null };
  }
  
  reportStatus(`📂 Using emulator at: ${emulatorPath}`);
  
  // Start emulator as detached process
  try {
    // Use spawn with pipe to capture any immediate errors
    const emulatorProcess = spawn(emulatorPath, ['-avd', avdName], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        // Ensure ANDROID_HOME and paths are set
        ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'Library/Android/sdk'),
        ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'Library/Android/sdk'),
      }
    });
    
    // Capture early stderr for debugging (first 2 seconds)
    let stderrOutput = '';
    emulatorProcess.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });
    
    // Check for immediate spawn errors
    emulatorProcess.on('error', (err) => {
      reportStatus(`❌ Emulator spawn error: ${err.message}`);
    });
    
    // Wait a moment to check if process started
    await sleep(2000);
    
    // Check if process is still running (didn't exit immediately)
    if (emulatorProcess.exitCode !== null) {
      reportStatus(`❌ Emulator exited immediately with code ${emulatorProcess.exitCode}`);
      if (stderrOutput) {
        reportStatus(`   Error: ${stderrOutput.substring(0, 200)}`);
      }
      return { started: false, message: `Emulator failed to start: ${stderrOutput || 'Unknown error'}`, deviceId: null };
    }
    
    // Detach the process so it continues after we return
    emulatorProcess.unref();
    emulatorProcess.stdout.unref();
    emulatorProcess.stderr.unref();
    
    reportStatus('✓ Emulator process started, waiting for boot...');
    
  } catch (e) {
    reportStatus(`❌ Failed to spawn emulator: ${e.message}`);
    return { started: false, message: `Failed to spawn emulator: ${e.message}`, deviceId: null };
  }
  
  // Wait for emulator to boot
  const startTime = Date.now();
  
  while (Date.now() - startTime < CONFIG.EMULATOR_START_TIMEOUT_MS) {
    await sleep(CONFIG.EMULATOR_BOOT_POLL_MS);
    
    const check = await checkAndroidDevice();
    if (check.connected) {
      // Check if emulator is fully booted
      const isBooted = await checkEmulatorBooted(check.deviceId);
      if (isBooted) {
        reportStatus(`✅ Emulator ready: ${check.deviceId}`);
        return { started: true, message: `Emulator started: ${avdName}`, deviceId: check.deviceId };
      } else {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        reportStatus(`⏳ Device visible, waiting for boot to complete... (${elapsed}s)`);
      }
    } else {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      reportStatus(`⏳ Waiting for emulator to appear... (${elapsed}s)`);
    }
  }
  
  // Final check - maybe it's connected but boot check failed
  const finalCheck = await checkAndroidDevice();
  if (finalCheck.connected) {
    reportStatus(`⚠️ Emulator connected but boot check timed out. Proceeding anyway.`);
    return { started: true, message: `Emulator connected (boot check timeout): ${avdName}`, deviceId: finalCheck.deviceId };
  }
  
  return { started: false, message: 'Emulator boot timeout - emulator may still be starting', deviceId: null };
}

/**
 * Check if emulator is fully booted (not just connected)
 */
async function checkEmulatorBooted(deviceId) {
  const adbPath = await findExecutable(getAdbPath(), 'version');
  if (!adbPath) return false;
  
  try {
    // Check boot completed property
    const { stdout } = await execAsync(
      `"${adbPath}" -s ${deviceId} shell getprop sys.boot_completed`,
      { timeout: 5000 }
    );
    return stdout.trim() === '1';
  } catch {
    return false;
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Perform health check (with caching)
 * @param {boolean} bypassCache - Force fresh check
 */
async function checkHealth(bypassCache = false) {
  const now = Date.now();
  
  if (!bypassCache && lastHealthCheck && (now - lastHealthCheckTime) < CONFIG.HEALTH_CHECK_CACHE_MS) {
    return lastHealthCheck;
  }
  
  const [appiumStatus, deviceStatus] = await Promise.all([
    checkAppiumServer(),
    checkAndroidDevice()
  ]);
  
  const recommendations = [];
  
  if (!appiumStatus.running) {
    recommendations.push('Run `appium` to start the Appium server');
  }
  
  if (!deviceStatus.connected) {
    const emulators = await listAvailableEmulators();
    if (emulators.length > 0) {
      recommendations.push(`Run \`emulator -avd ${emulators[0]}\` to start an emulator`);
    } else {
      recommendations.push('Create an emulator in Android Studio or connect a physical device');
    }
  }
  
  const result = {
    healthy: appiumStatus.running && deviceStatus.connected,
    appiumRunning: appiumStatus.running,
    emulatorRunning: deviceStatus.connected,
    appiumVersion: appiumStatus.version,
    deviceId: deviceStatus.deviceId,
    deviceType: deviceStatus.deviceType,
    deviceModel: deviceStatus.model,
    error: [appiumStatus.error, deviceStatus.error].filter(Boolean).join('; ') || null,
    recommendations
  };
  
  lastHealthCheck = result;
  lastHealthCheckTime = now;
  
  return result;
}

/**
 * Ensure Android infrastructure is ready, auto-starting services as needed
 * 
 * @param {Object} options
 * @param {boolean} options.autoStart - Auto-start Appium and emulator (default: true)
 * @param {boolean} options.throwOnError - Throw if infrastructure not ready (default: true)
 * @param {function(string): void} options.onStatus - Callback for status updates
 * @returns {Promise<{health: HealthStatus, actions: string[]}>}
 */
async function ensureReady(options = {}) {
  const { 
    autoStart = true, 
    throwOnError = true,
    onStatus = null 
  } = options;
  
  if (onStatus) setStatusCallback(onStatus);
  
  const actions = []; // Track what we did
  
  // Initial health check
  let health = await checkHealth(true);
  
  if (health.healthy) {
    reportStatus('✅ Android infrastructure ready');
    return { health, actions: ['Infrastructure already healthy'] };
  }
  
  if (!autoStart) {
    if (throwOnError) {
      throw createReadableError(health);
    }
    return { health, actions: [] };
  }
  
  // -------------------------------------------------------------------------
  // Auto-start sequence: Appium first, then emulator
  // -------------------------------------------------------------------------
  
  reportStatus('🔧 Android infrastructure not ready. Starting services...');
  
  // Step 1: Start Appium if needed
  if (!health.appiumRunning) {
    const appiumResult = await startAppiumServer();
    actions.push(appiumResult.message);
    
    if (!appiumResult.started) {
      reportStatus(`❌ ${appiumResult.message}`);
      if (throwOnError) {
        throw new Error(`Failed to start Appium: ${appiumResult.message}`);
      }
    }
  } else {
    actions.push(`Appium already running (v${health.appiumVersion})`);
  }
  
  // Step 2: Start emulator if needed
  if (!health.emulatorRunning) {
    const emulatorResult = await startEmulator();
    actions.push(emulatorResult.message);
    
    if (!emulatorResult.started) {
      reportStatus(`❌ ${emulatorResult.message}`);
      if (throwOnError) {
        throw new Error(`Failed to start emulator: ${emulatorResult.message}`);
      }
    }
  } else {
    actions.push(`Device already connected: ${health.deviceId}`);
  }
  
  // Final health check
  health = await checkHealth(true);
  
  if (health.healthy) {
    reportStatus('✅ All services started successfully');
  } else {
    reportStatus('⚠️ Some services could not be started');
    if (throwOnError) {
      throw createReadableError(health);
    }
  }
  
  return { health, actions };
}

/**
 * Create a readable error message from health status
 */
function createReadableError(health) {
  const lines = ['Android automation infrastructure not ready:'];
  
  if (!health.appiumRunning) {
    lines.push('  ❌ Appium server is not running');
  }
  if (!health.emulatorRunning) {
    lines.push('  ❌ No Android device/emulator connected');
  }
  
  if (health.recommendations.length > 0) {
    lines.push('');
    lines.push('To fix manually:');
    health.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
  }
  
  return new Error(lines.join('\n'));
}

/**
 * Reset health check cache
 */
function resetHealthCache() {
  lastHealthCheck = null;
  lastHealthCheckTime = 0;
}

/**
 * Simple sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  // Main API
  checkHealth,
  ensureReady,
  resetHealthCache,
  
  // Individual checks (for health tool)
  checkAppiumServer,
  checkAndroidDevice,
  listAvailableEmulators,
  
  // Individual starters (for manual control)
  startAppiumServer,
  startEmulator,
  
  // Status reporting
  setStatusCallback,
};
