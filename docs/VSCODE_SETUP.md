# VS Code Copilot MCP Integration Guide

This guide explains how to add Playwright MCP with Android support to VS Code Copilot.

## Quick Setup (3 Steps)

### Step 1: Install the Package

```bash
# Option A: Install globally
npm install -g @playwright/mcp

# Option B: Use npx (no install needed)
npx @playwright/mcp --help
```

### Step 2: Add MCP Server to VS Code

Open VS Code Settings (JSON) and add:

```json
{
  "github.copilot.chat.mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  }
}
```

### Step 3: Start Android Prerequisites (for Android tools)

```bash
# Terminal 1: Start Android emulator
emulator -avd <your-avd-name>

# Terminal 2: Start Appium server
APPIUM_HOME=/tmp/appium-home appium --port 4723
```

## Detailed Setup Options

### Option A: VS Code User Settings (Global)

1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "Preferences: Open User Settings (JSON)"
3. Add the MCP server configuration:

```json
{
  "github.copilot.chat.mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  }
}
```

### Option B: Workspace Settings (Project-specific)

Create `.vscode/settings.json` in your project:

```json
{
  "github.copilot.chat.mcpServers": {
    "playwright-android": {
      "command": "node",
      "args": ["./node_modules/@playwright/mcp/cli.js"],
      "env": {
        "APPIUM_URL": "http://localhost:4723",
        "ANDROID_DEVICE": "emulator-5554"
      }
    }
  }
}
```

### Option C: Using mcp.json (Recommended)

Create `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {
        "APPIUM_URL": "http://localhost:4723"
      }
    }
  }
}
```

## Available Tools

Once configured, Copilot has access to these tools:

### Web Tools (Playwright)
- `browser_navigate` - Navigate to URL
- `browser_click` - Click elements
- `browser_type` - Type text
- `browser_screenshot` - Take screenshot
- And more...

### Android Tools (New!)
- `android_launch_app` - Launch Android app by package name
- `android_tap` - Tap element or coordinates
- `android_input_text` - Input text into fields
- `android_screenshot` - Capture device screenshot

## Usage Examples

### Example 1: Web Automation
```
User: "Go to github.com and take a screenshot"

Copilot will:
1. Call browser_navigate with url: "https://github.com"
2. Call browser_screenshot
3. Return the screenshot
```

### Example 2: Android Automation
```
User: "Open Settings on Android and tap on Network"

Copilot will:
1. Call android_launch_app with packageName: "com.android.settings"
2. Call android_tap with selector: "text=Network"
3. Return success confirmation
```

### Example 3: Mixed Workflow
```
User: "Take screenshots of both the web page and Android device"

Copilot will:
1. Call browser_screenshot for web
2. Call android_screenshot for Android
3. Return both screenshots
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPIUM_URL` | Appium server URL | `http://localhost:4723` |
| `ANDROID_DEVICE` | Device name from `adb devices` | `emulator-5554` |
| `PLAYWRIGHT_MCP_ANDROID_MOCK` | Use mock driver (for testing) | unset |

## Troubleshooting

### "Android tools not available"

1. Check Appium is running:
   ```bash
   curl http://localhost:4723/status
   ```

2. Check emulator is connected:
   ```bash
   adb devices
   ```

3. Verify UiAutomator2 driver is installed:
   ```bash
   appium driver list --installed
   ```

### "Cannot find module '@playwright/mcp'"

Install the package:
```bash
npm install -g @playwright/mcp
# or
npm install @playwright/mcp --save-dev
```

### "Connection refused to Appium"

Make sure Appium is running:
```bash
# Install Appium if needed
npm install -g appium
appium driver install uiautomator2

# Start Appium
appium --port 4723
```

### Copilot doesn't use Android tools

1. Restart VS Code after adding MCP configuration
2. Check the MCP server is registered (look for "MCP" in VS Code status bar)
3. Try explicitly asking: "Use the android_tap tool to..."

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] VS Code with GitHub Copilot extension
- [ ] Copilot Chat enabled
- [ ] For Android:
  - [ ] Android SDK installed
  - [ ] Android emulator created and running
  - [ ] Appium installed (`npm install -g appium`)
  - [ ] UiAutomator2 driver (`appium driver install uiautomator2`)

## Verifying Installation

1. Open VS Code
2. Open Copilot Chat (`Cmd+Shift+I` or `Ctrl+Shift+I`)
3. Ask: "What MCP tools are available?"
4. Copilot should list Playwright and Android tools

## Publishing Your Own Fork

If you want to publish with customizations:

```bash
# Update package.json name
# e.g., "@yourorg/playwright-mcp-android"

# Build and publish
npm publish
```

Then users can install:
```bash
npm install -g @yourorg/playwright-mcp-android
```

And configure in VS Code:
```json
{
  "github.copilot.chat.mcpServers": {
    "playwright-android": {
      "command": "npx",
      "args": ["-y", "@yourorg/playwright-mcp-android"]
    }
  }
}
```
