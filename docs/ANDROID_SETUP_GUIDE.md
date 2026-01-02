# Android Emulator Setup Guide

This guide documents all the steps required to run Android automation with Playwright MCP on a real emulator or device.

## Current Status

### ✅ Implemented Features
- 4 Android tools (`android_launch_app`, `android_tap`, `android_input_text`, `android_screenshot`)
- Playwright-style selector translation to Android selectors
- Automatic waits using Appium native methods
- Mock driver for CI testing (38 tests passing)
- Handler routing for Android tools

### ⏳ Prerequisites for Real Emulator Testing

The following steps are required before running on an actual emulator:

---

## Step 1: Install Android SDK

### macOS
```bash
# Install via Homebrew
brew install --cask android-commandlinetools

# Or download Android Studio which includes SDK
# https://developer.android.com/studio
```

### Linux (Ubuntu/Debian)
```bash
# Install Java (required)
sudo apt update
sudo apt install openjdk-17-jdk

# Download command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-*.zip -d ~/android-sdk
```

### Windows
1. Download Android Studio from https://developer.android.com/studio
2. Install and ensure SDK is included

### Environment Variables
Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export ANDROID_HOME=$HOME/Android/Sdk  # Or wherever SDK is installed
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

---

## Step 2: Create Android Virtual Device (AVD)

### Using Command Line
```bash
# Install required SDK packages
sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis;x86_64"

# Accept licenses
sdkmanager --licenses

# Create AVD
avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_7"
```

### Using Android Studio
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **Create Device**
4. Select device (e.g., Pixel 7)
5. Select system image (API 34 recommended)
6. Finish wizard

---

## Step 3: Start the Emulator

### Command Line
```bash
# Start emulator
emulator -avd Pixel_7_API_34

# Or with specific options
emulator -avd Pixel_7_API_34 -no-snapshot-load -gpu swiftshader_indirect
```

### Verify Device Connection
```bash
# List connected devices
adb devices

# Should show something like:
# emulator-5554   device
```

---

## Step 4: Install Appium

### Install Appium Server
```bash
# Install Appium globally
npm install -g appium

# Verify installation
appium --version
```

### Install UiAutomator2 Driver
```bash
# Install the Android driver
appium driver install uiautomator2

# Verify driver
appium driver list --installed
```

### Install Appium Doctor (Optional but Recommended)
```bash
# Install doctor for diagnosing issues
npm install -g appium-doctor

# Run diagnosis
appium-doctor --android
```

---

## Step 5: Start Appium Server

```bash
# Start Appium (default port 4723)
appium

# Or with specific options
appium --address 127.0.0.1 --port 4723 --log-level info
```

Expected output:
```
[Appium] Welcome to Appium v2.x.x
[Appium] Appium REST http interface listener started on http://127.0.0.1:4723
```

---

## Step 6: Configure Environment for Playwright MCP

Set the following environment variables:

```bash
# Required
export APPIUM_URL=http://localhost:4723

# Optional - customize device
export ANDROID_DEVICE="emulator-5554"  # Or your device name from 'adb devices'
export ANDROID_AVD="Pixel_7_API_34"    # Your AVD name

# For testing
unset PLAYWRIGHT_MCP_ANDROID_MOCK      # Ensure mock mode is disabled
```

---

## Step 7: Install Test App on Emulator

For testing, install an app on the emulator:

```bash
# Install from APK
adb install path/to/your-app.apk

# Or use Android Settings app (pre-installed)
# Package name: com.android.settings
```

---

## Step 8: Run Playwright MCP with Android

### Using CLI
```bash
# Start Playwright MCP
npx @anthropic/mcp-cli run -- npx playwright-mcp
```

### Using API
```javascript
const { createConnection } = require('@playwright/mcp');

async function test() {
  const connection = await createConnection({
    // Your config
  });
  
  // Launch Android Settings app
  await connection.callTool({
    name: 'android_launch_app',
    arguments: { packageName: 'com.android.settings' }
  });
  
  // Tap on an element
  await connection.callTool({
    name: 'android_tap',
    arguments: { selector: 'text=Network & internet' }
  });
  
  // Take screenshot
  const screenshot = await connection.callTool({
    name: 'android_screenshot',
    arguments: {}
  });
  
  console.log('Screenshot captured!');
}

test();
```

---

## Troubleshooting

### Common Issues

#### 1. "Failed to connect to Appium"
**Cause**: Appium server not running or wrong URL

**Solution**:
```bash
# Check Appium is running
curl http://localhost:4723/status

# Expected: {"value":{"ready":true,...}}
```

#### 2. "No device connected"
**Cause**: Emulator not running or ADB not detecting it

**Solution**:
```bash
# Restart ADB server
adb kill-server
adb start-server
adb devices

# If emulator not showing, restart it
```

#### 3. "Session not created: UiAutomator2 not installed"
**Cause**: UiAutomator2 driver not installed

**Solution**:
```bash
appium driver install uiautomator2
appium driver list --installed
```

#### 4. "Element not found" errors
**Cause**: Selector translation may not match app structure

**Solution**:
- Use Appium Inspector to find correct selectors
- Prefer `~accessibility-id` (maps to `content-desc` in Android)
- Use `data-testid` attributes in your app

#### 5. "ANDROID_HOME not set"
**Cause**: Environment variables not configured

**Solution**:
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## CI/CD Setup (GitHub Actions)

For running on CI, use Android emulator in GitHub Actions:

```yaml
name: Android Tests

on: [push, pull_request]

jobs:
  android-test:
    runs-on: macos-latest  # macOS has better emulator support
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Start Appium
        run: |
          npm install -g appium
          appium driver install uiautomator2
          appium &
          sleep 5
      
      - name: AVD Cache
        uses: actions/cache@v4
        id: avd-cache
        with:
          path: |
            ~/.android/avd/*
            ~/.android/adb*
          key: avd-api-34
      
      - name: Create AVD
        if: steps.avd-cache.outputs.cache-hit != 'true'
        run: |
          echo "y" | sdkmanager "system-images;android-34;google_apis;x86_64"
          echo "no" | avdmanager create avd -n test_avd -k "system-images;android-34;google_apis;x86_64" --force
      
      - name: Start Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          script: npm test
```

---

## Missing Features / Known Limitations

### Not Yet Implemented

1. **Swipe/Scroll Actions**
   - `android_swipe` tool not implemented
   - Workaround: Use coordinate-based taps at scroll positions

2. **Long Press**
   - `android_long_press` tool not implemented
   - Needed for context menus

3. **Keyboard Actions**
   - Hardware key simulation (Back, Home, etc.)
   - `android_press_key` tool not implemented

4. **Multi-touch Gestures**
   - Pinch zoom, multi-finger tap
   - Complex gesture support

5. **Device Orientation**
   - Rotate screen
   - `android_set_orientation` not implemented

6. **App Lifecycle**
   - `android_terminate_app` - Force close app
   - `android_reset_app` - Reset app state
   - `android_background_app` - Send to background

7. **File Operations**
   - Push/pull files to device
   - Access app data directories

8. **Network Simulation**
   - Offline mode
   - Slow network conditions

### Current Limitations

1. **No iOS Support** - MVP is Android-only
2. **Single Device** - Cannot run on multiple devices simultaneously
3. **No Visual Comparison** - No built-in screenshot diff
4. **Limited Selector Types** - Not all Playwright selectors translate perfectly

---

## Next Steps for Full Production

1. Install Android SDK and create emulator
2. Install and start Appium with UiAutomator2
3. Set environment variables
4. Test with real app
5. Add missing tools as needed (swipe, long press, etc.)

---

## Quick Start Checklist

- [ ] Android SDK installed
- [ ] `ANDROID_HOME` environment variable set
- [ ] AVD (emulator) created
- [ ] Emulator running (`adb devices` shows device)
- [ ] Appium installed (`appium --version`)
- [ ] UiAutomator2 driver installed (`appium driver list --installed`)
- [ ] Appium server running (`curl http://localhost:4723/status`)
- [ ] `APPIUM_URL` set (if not using default)
- [ ] `PLAYWRIGHT_MCP_ANDROID_MOCK` unset (for real testing)
- [ ] Test app installed on emulator

---

## References

- [Appium Documentation](https://appium.io/docs/en/latest/)
- [UiAutomator2 Driver](https://github.com/appium/appium-uiautomator2-driver)
- [Android SDK Setup](https://developer.android.com/studio/command-line)
- [Appium Inspector](https://github.com/appium/appium-inspector) - GUI for finding selectors
