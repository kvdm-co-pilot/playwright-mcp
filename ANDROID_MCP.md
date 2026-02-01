# Android MCP Server

A Model Context Protocol (MCP) server that enables AI agents to interact with Android devices and emulators. This server provides tools for launching apps, tapping elements, taking screenshots, and understanding what's on screen.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [VS Code Configuration](#vs-code-configuration)
- [Available Tools](#available-tools)
  - [android_health](#android_health)
  - [android_snapshot](#android_snapshot)
  - [android_tap](#android_tap)
  - [android_input_text](#android_input_text)
  - [android_launch_app](#android_launch_app)
  - [android_screenshot](#android_screenshot)
- [Workflow Guide](#workflow-guide)
- [Selector Reference](#selector-reference)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** ≥ 18
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **Android SDK** with platform-tools
   - Install via [Android Studio](https://developer.android.com/studio) or standalone SDK
   - Set `ANDROID_HOME` environment variable:
     ```bash
     # macOS (add to ~/.zshrc or ~/.bashrc)
     export ANDROID_HOME=~/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
     
     # Linux
     export ANDROID_HOME=~/Android/Sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
     
     # Windows (System Environment Variables)
     ANDROID_HOME=C:\Users\<user>\AppData\Local\Android\Sdk
     ```

3. **Appium** (v2.x) with UiAutomator2 driver
   ```bash
   # Install Appium globally
   npm install -g appium
   
   # Install the UiAutomator2 driver
   appium driver install uiautomator2
   
   # Verify installation
   appium driver list --installed
   ```

4. **Android Emulator or Physical Device**
   - Create an emulator in Android Studio AVD Manager, OR
   - Connect a physical device with USB debugging enabled
   
   ```bash
   # List available emulators
   emulator -list-avds
   
   # Start an emulator
   emulator -avd <AVD_NAME> &
   
   # Verify device is connected
   adb devices
   ```

### Prerequisites Verification Checklist

Before configuring VS Code, verify the required software is **installed** (Appium and emulator don't need to be running - they'll auto-start):

| Requirement | Verification Command | Expected Result |
|-------------|---------------------|-----------------|
| Node.js ≥ 18 | `node --version` | v18.x.x or higher |
| Appium installed | `appium --version` | v2.x.x |
| UiAutomator2 driver | `appium driver list --installed` | Shows `uiautomator2` |
| Emulator exists | `emulator -list-avds` | Lists at least one AVD |
| ADB available | `adb --version` | Shows version info |

**Quick verification script:**

```bash
# Run this to check all prerequisites are INSTALLED
echo "=== Node.js ===" && node --version && \
echo "=== Appium ===" && appium --version && \
echo "=== Available Emulators ===" && emulator -list-avds && \
echo "=== Appium Drivers ===" && appium driver list --installed
```

> **Note:** You don't need to manually start Appium or the emulator. The MCP server will automatically start them when you use any Android tool.

---

## Auto-Start Behavior

The Android MCP server automatically manages infrastructure:

1. **When you call any Android tool** (tap, snapshot, etc.):
   - Checks if Appium is running → starts it if not
   - Checks if emulator/device is connected → starts first available emulator if not
   - Waits for services to be ready before executing the command

2. **Status messages** are logged during startup:
   ```
   🔧 Android infrastructure not ready. Starting services...
   🚀 Starting Appium server...
   ✅ Appium started successfully (v2.5.0)
   📱 No Android device found. Attempting to start emulator...
   🚀 Starting emulator: Pixel_7_API_34
   ⏳ Waiting for emulator to boot... (15s)
   ✅ Emulator ready: emulator-5554
   ✅ All services started successfully
   ```

3. **Timeouts:**
   - Appium: 30 seconds to start
   - Emulator: 2 minutes to boot

4. **If auto-start fails**, you'll get clear error messages with manual fix commands.

---

## Installation

### Option 1: Global Install via npm link (Recommended)

```bash
# Clone the repository
git clone https://github.com/microsoft/playwright-mcp.git
cd playwright-mcp

# Install dependencies
npm install

# Link globally (makes it available system-wide)
npm link
```

This creates a global symlink so you can use `npx @playwright/mcp` from anywhere.

### Option 2: Direct Path (No Global Install)

If you prefer not to install globally, note the full path to `cli.js`:

```bash
cd playwright-mcp
pwd  # e.g., /Users/yourname/playwright-mcp
# Use: /Users/yourname/playwright-mcp/cli.js in your config
```

---

## VS Code Configuration

MCP servers for GitHub Copilot are configured in a dedicated `mcp.json` file, **NOT** in `settings.json`.

### Configuration File Location

| Platform | Path |
|----------|------|
| **macOS** | `~/Library/Application Support/Code/User/mcp.json` |
| **Linux** | `~/.config/Code/User/mcp.json` |
| **Windows** | `%APPDATA%\Code\User\mcp.json` |

### Create the `mcp.json` File

Create the file at the appropriate location for your platform with this content:

**If you used `npm link` (Option 1):**

```json
{
  "servers": {
    "playwright-android": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp"],
      "env": {
        "ANDROID_HOME": "/Users/yourname/Library/Android/sdk",
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  },
  "inputs": []
}
```

**If using direct path (Option 2):**

```json
{
  "servers": {
    "playwright-android": {
      "type": "stdio",
      "command": "node",
      "args": ["/full/path/to/playwright-mcp/cli.js"],
      "env": {
        "ANDROID_HOME": "/Users/yourname/Library/Android/sdk",
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  },
  "inputs": []
}
```

> **Important:** Use `"type": "stdio"` — this runs the MCP server as a Node.js process that communicates via stdin/stdout.

### Quick Setup Commands (macOS)

```bash
# Create the mcp.json file
cat > ~/Library/Application\ Support/Code/User/mcp.json << 'EOF'
{
  "servers": {
    "playwright-android": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/yourname/playwright-mcp/cli.js"],
      "env": {
        "ANDROID_HOME": "/Users/yourname/Library/Android/sdk",
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  },
  "inputs": []
}
EOF

# Edit the file to update paths for your system
open ~/Library/Application\ Support/Code/User/mcp.json
```

### Per-Project Configuration (Alternative)

You can also create a `.vscode/mcp.json` file in your project root for project-specific configuration:

```json
{
  "servers": {
    "playwright-android": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/playwright-mcp/cli.js"],
      "env": {
        "ANDROID_HOME": "/Users/yourname/Library/Android/sdk",
        "APPIUM_URL": "http://localhost:4723"
      }
    }
  },
  "inputs": []
}
```

### ⚠️ Common Mistake

**Don't use `settings.json`** — the following does NOT work:

```json
// ❌ WRONG - This goes in settings.json but won't work for MCP
{
  "github.copilot.chat.mcpServers": {
    "playwright-android": { ... }
  }
}
```

### Verify Configuration

1. **Reload VS Code:** `Cmd+Shift+P` → "Developer: Reload Window"
2. **Open Copilot Chat** (Agent mode)
3. **Verify tools loaded:** Ask "What Android tools are available?"
4. **Test connection:** Ask "Check Android health"

If tools don't appear, check the VS Code logs:
```bash
# macOS
cat ~/Library/Application\ Support/Code/logs/*/window1/renderer.log | grep -i mcp
```

---

## Available Tools

### android_health

**Purpose:** Check if Android automation infrastructure is ready, with optional auto-start.

**When to Use:** 
- Before starting any Android automation
- When other tools fail unexpectedly
- To diagnose setup issues
- To automatically start Appium and emulator

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| autoStart | boolean | false | If true, automatically start Appium and emulator if not running |
| verbose | boolean | false | Include list of available emulators |

**Returns:**
- Appium server status (running/not running, version)
- Device connection status (connected/not connected, device ID)
- Actions taken (if autoStart was used)
- Recommendations if something is wrong

**Example Usage:**
```
"Check if my Android setup is working"
"Start Android services and check health"
"Is my emulator connected?"
```

**Example Response (with autoStart):**
```markdown
# Android Infrastructure Health

## Actions Taken

- 🚀 Starting Appium server...
- ✅ Appium started (v2.5.0)
- 📱 Starting emulator: Pixel_7_API_34
- ✅ Emulator ready: emulator-5554

## Overall Status: ✅ Ready

### Components
| Component | Status | Details |
|-----------|--------|---------|
| Appium Server | ✅ Running | v2.5.0 |
| Android Device | ✅ Connected | emulator-5554 |

**Device Type:** emulator (sdk_gphone64_arm64)
```

> **Note:** Other Android tools (tap, snapshot, etc.) automatically start services if needed. You only need to call `android_health` with `autoStart: true` if you want to see the startup progress.

---

### android_snapshot

**Purpose:** Get a comprehensive view of all interactive elements on the current screen.

**When to Use:**
- **ALWAYS call this first** before tapping or interacting
- To understand what's visible on screen
- To find the correct selector for an element
- To check toggle/switch states

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| format | string | "markdown" | Output format: "markdown" (human-readable) or "json" (structured) |

**Returns:**
- Screen dimensions
- Table of all interactive elements with:
  - Type (button, toggle, input, text, etc.)
  - Label/text content
  - Selector to use for tapping
  - State (checked/unchecked, focused, disabled)
- Separate sections for toggles, input fields, scrollable areas

**Example Usage:**
```
"What's on the screen?"
"Show me all the buttons I can tap"
"Find the WiFi toggle"
"Get a snapshot of the current screen"
```

**Example Response:**
```markdown
# Android Screen Snapshot

📱 **Screen:** 1080×2400
📊 **Found:** 25 interactive elements

## Interactive Elements

| # | Type | Label | Selector | State |
|--:|------|-------|----------|-------|
| 1 | button | Navigate up | `content-desc=Navigate up` | - |
| 2 | clickable | Network & internet | `text=Network & internet` | - |
| 3 | toggle | Wi-Fi | `resource-id=com.android.settings:id/switchWidget` | ☑ ON |
| 4 | text | Settings | `text=Settings` | - |

## Toggles & Switches

1. **Wi-Fi** → ✅ **ON**
   Selector: `resource-id=com.android.settings:id/switchWidget`

## Input Fields

(none on this screen)

## Scrollable Areas

1. RecyclerView at y=541-2016
```

---

### android_tap

**Purpose:** Tap on an element or screen coordinates.

**When to Use:**
- To click buttons, links, menu items
- To toggle switches on/off
- To select items in a list
- To interact with any clickable element

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| selector | string | Either selector OR x,y | Element selector (see [Selector Reference](#selector-reference)) |
| x | number | Either selector OR x,y | X coordinate for tap |
| y | number | Either selector OR x,y | Y coordinate for tap |

**Returns:** Confirmation of tap action

**Example Usage:**
```
"Tap on the Settings button"
"Click the WiFi toggle"
"Tap at coordinates 540, 825"
"Press the back button"
```

**Example Calls:**
```json
// By text selector
{"selector": "text=Network & internet"}

// By content description
{"selector": "content-desc=Navigate up"}

// By resource ID
{"selector": "resource-id=com.android.settings:id/switchWidget"}

// By coordinates (from snapshot bounds)
{"x": 950, "y": 825}
```

**Important Notes:**
- Always use `android_snapshot` first to find the correct selector
- For toggles/switches, tap on the right side where the switch is (use coordinates)
- If text selector fails, try coordinates from the snapshot bounds

---

### android_input_text

**Purpose:** Type text into an input field.

**When to Use:**
- To fill in text fields
- To enter search queries
- To type usernames, passwords, etc.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| selector | string | Yes | Selector for the input field |
| text | string | Yes | Text to type |
| clear | boolean | No (default: true) | Clear existing text before typing |

**Returns:** Confirmation of text input

**Example Usage:**
```
"Type 'hello world' in the search box"
"Enter username 'john@example.com'"
"Fill in the password field"
```

**Example Call:**
```json
{
  "selector": "resource-id=com.example:id/search_input",
  "text": "hello world",
  "clear": true
}
```

**Important Notes:**
- Tap the input field first if it's not already focused
- Use `android_snapshot` to find the input field selector
- Set `clear: false` to append text instead of replacing

---

### android_launch_app

**Purpose:** Launch an Android application.

**When to Use:**
- To start an app by package name
- To open Settings, Chrome, or any installed app
- At the beginning of a test flow

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| packageName | string | Yes | Android package name (e.g., "com.android.settings") |

**Returns:** Confirmation that app was launched

**Common Package Names:**
| App | Package Name |
|-----|--------------|
| Settings | com.android.settings |
| Chrome | com.android.chrome |
| Phone | com.android.dialer |
| Messages | com.google.android.apps.messaging |
| Gmail | com.google.android.gm |
| Play Store | com.android.vending |
| Camera | com.android.camera |
| Files | com.google.android.apps.nbu.files |

**Example Usage:**
```
"Open Settings"
"Launch Chrome browser"
"Start the camera app"
```

**Example Call:**
```json
{"packageName": "com.android.settings"}
```

**Finding Package Names:**
```bash
# List all installed packages
adb shell pm list packages

# Find package for a running app
adb shell dumpsys window | grep mCurrentFocus
```

---

### android_screenshot

**Purpose:** Capture a screenshot of the device screen.

**When to Use:**
- To see what's currently displayed
- To debug visual issues
- To verify UI state
- When snapshot text isn't enough context

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | No | Path to save screenshot file |

**Returns:** Base64-encoded screenshot image (or saved file path)

**Example Usage:**
```
"Take a screenshot"
"Show me what's on screen"
"Capture the current state"
```

---

## Workflow Guide

### Recommended Workflow for Any Task

1. **Check Health First** (if unsure about setup)
   ```
   → android_health
   ```

2. **Get Screen Snapshot** (ALWAYS do this before interacting)
   ```
   → android_snapshot
   ```

3. **Perform Action** (tap, type, etc.)
   ```
   → android_tap with selector from snapshot
   ```

4. **Verify Result** (get new snapshot)
   ```
   → android_snapshot
   ```

### Example: Turn Off WiFi

```
Step 1: Launch Settings
→ android_launch_app {"packageName": "com.android.settings"}

Step 2: See what's on screen
→ android_snapshot
(Response shows "Network & internet" option)

Step 3: Tap Network & internet
→ android_tap {"selector": "text=Network & internet"}

Step 4: See network options
→ android_snapshot
(Response shows "Internet" with "AndroidWifi")

Step 5: Tap Internet
→ android_tap {"selector": "text=Internet"}

Step 6: Find WiFi toggle
→ android_snapshot
(Response shows WiFi toggle is ON at coordinates)

Step 7: Tap WiFi toggle (use coordinates for switches)
→ android_tap {"x": 950, "y": 825}

Step 8: Verify WiFi is off
→ android_snapshot
(Response shows WiFi toggle is now OFF ☐)
```

---

## Selector Reference

### Selector Types (Priority Order)

| Type | Format | Example | Best For |
|------|--------|---------|----------|
| Text | `text=<value>` | `text=Settings` | Buttons, labels with visible text |
| Content Description | `content-desc=<value>` | `content-desc=Navigate up` | Icons, images with accessibility labels |
| Resource ID | `resource-id=<value>` | `resource-id=com.android.settings:id/switch` | Stable IDs from app code |
| Coordinates | `x` + `y` params | `{"x": 540, "y": 825}` | When other selectors fail |

### Tips for Choosing Selectors

1. **Prefer `text=` selectors** - Most readable and reliable for visible text
2. **Use `content-desc=`** for icons/images without text
3. **Use `resource-id=`** for stable elements that might change text
4. **Use coordinates** as last resort, especially for:
   - Toggle switches (tap the right side)
   - Elements inside lists
   - When text changes dynamically

### Finding the Right Selector

Always use `android_snapshot` first! It returns:
- The **primary selector** (best option) in the Selector column
- The **bounds** which give you coordinates
- **Child text** for containers that have text inside

---

## Troubleshooting

### MCP Server Not Loading in VS Code

**Symptoms:** Android tools don't appear in Copilot Chat

1. **Check `mcp.json` location** (NOT `settings.json`):
   ```bash
   # macOS - verify file exists
   cat ~/Library/Application\ Support/Code/User/mcp.json
   ```

2. **Verify JSON syntax is valid:**
   ```bash
   # macOS - check for JSON errors
   python3 -c "import json; json.load(open('$HOME/Library/Application Support/Code/User/mcp.json'))"
   ```

3. **Check VS Code logs:**
   ```bash
   # macOS - look for MCP errors
   grep -i "mcp\|playwright" ~/Library/Application\ Support/Code/logs/*/window1/renderer.log | tail -20
   ```

4. **Reload VS Code:** `Cmd+Shift+P` → "Developer: Reload Window"

### MCP Loads But Tools Fail

**Symptoms:** Tools appear but return errors

1. **Check Appium is running:**
   ```bash
   curl http://localhost:4723/status
   # Should return JSON with "ready": true
   ```

2. **Check emulator is running:**
   ```bash
   adb devices
   # Should list a device like "emulator-5554  device"
   ```

3. **Use `android_health` tool** to diagnose:
   - Ask Copilot: "Check Android health"
   - It will tell you exactly what's missing

### "Appium server is not running"

```bash
# Start Appium
appium &

# Or with logging
appium --log-level info
```

### "No Android device connected"

```bash
# Check connected devices
adb devices

# If empty, start an emulator
emulator -list-avds
emulator -avd <AVD_NAME> &

# Or check USB debugging on physical device
```

### "Failed to create session"

1. Make sure UiAutomator2 is installed:
   ```bash
   appium driver list --installed
   # Should show uiautomator2
   
   # If not, install it:
   appium driver install uiautomator2
   ```

2. Restart Appium:
   ```bash
   pkill -f appium
   appium &
   ```

### "Element not found"

1. **Get a fresh snapshot** - Screen may have changed
2. **Check the element is visible** - May need to scroll
3. **Try alternative selectors** - text, content-desc, resource-id, or coordinates
4. **Wait for screen to load** - Try again after a moment

### "Tap doesn't work on toggle"

Toggle switches are often part of a larger clickable row. Try:
1. Get the **bounds** from snapshot
2. Tap on the **right side** where the switch visual is (higher X coordinate)
3. Use coordinate tap: `{"x": 950, "y": <y-from-bounds>}`

### Common ADB Commands for Debugging

```bash
# Check device is responding
adb devices

# Get current activity (what's on screen)
adb shell dumpsys window | grep mCurrentFocus

# Get current app package
adb shell dumpsys activity activities | grep mResumedActivity

# Force stop an app
adb shell am force-stop <package>

# Press back button
adb shell input keyevent KEYCODE_BACK

# Press home button
adb shell input keyevent KEYCODE_HOME
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| ANDROID_HOME | Path to Android SDK | Auto-detected |
| APPIUM_URL | Appium server URL | http://localhost:4723 |
| ANDROID_DEVICE | Preferred device ID | First available |

---

## Limitations

- **One device at a time** - Currently works with a single connected device/emulator
- **No iOS support** - Android only via UiAutomator2
- **No visual element matching** - Uses accessibility tree, not image recognition
- **Emulator performance** - Physical devices are faster

---

## Support

For issues with:
- **This MCP server**: Check GitHub Issues
- **Appium**: https://appium.io/docs/en/latest/
- **Android Emulator**: https://developer.android.com/studio/run/emulator
