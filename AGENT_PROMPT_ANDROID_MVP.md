# Agent Prompt: Implement and Test Android MVP for Playwright MCP

## 🎯 Mission Overview

You are tasked with implementing a **minimal viable product (MVP)** for Android mobile automation in the Playwright MCP server. This implementation must follow all patterns, architectures, and best practices documented in this repository while ensuring comprehensive testing.

**Critical Success Factor**: Your implementation must be **tested, validated, and working** before completion.

---

## 📚 Required Reading (In Order)

Before starting implementation, you **MUST** read these documents in this order:

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the system design
   - Component layers and data flow
   - Wrapper pattern (core in `microsoft/playwright`, wrapper here)
   - Handler architecture
   
2. **[ANDROID_MOBILE_SUPPORT.md](ANDROID_MOBILE_SUPPORT.md)** - Your implementation blueprint
   - Core architecture decision (single handler)
   - All 4 implementation phases
   - Code skeletons for each tool
   
3. **[BEST_PRACTICES.md](BEST_PRACTICES.md)** - Coding standards
   - Testing patterns (black-box via MCP)
   - Error handling conventions
   - Commit message format

4. **[EXECUTION_PLAN.md](EXECUTION_PLAN.md)** - Development workflow
   - How to make changes (core vs wrapper)
   - Testing strategy
   - Common tasks

5. **[tests/fixtures.ts](tests/fixtures.ts)** - Test infrastructure
   - How MCP client is set up
   - Test server patterns
   - Custom matchers

---

## 🏗️ Architecture Recap (Critical)

### The Single Handler Pattern

**⚠️ MOST IMPORTANT**: ALL commands flow through ONE handler that routes based on `target` parameter.

```
Agent Command → MCP Server → Playwright Handler (ROUTING) → Web OR Android Tools
                                           ↓
                                    target='android'?
                                    ↙            ↘
                                  YES             NO
                                   ↓               ↓
                          Android Tools      Web Tools
                          (New - Appium)     (Existing - Playwright)
```

### Where to Implement

Based on **ARCHITECTURE.md** wrapper pattern:

- **Core Handler Logic**: Lives in `microsoft/playwright/packages/playwright/src/mcp/`
- **This Repository**: Packaging, CLI, integration tests

**Decision Point**: Since this is an MVP and the Android tools are experimental, you have two options:

#### Option A: Minimal Wrapper Implementation (Recommended for MVP)
- Add routing logic directly in this repo's initialization
- Keep Android tools in `src/tools/android/` (new directory)
- Intercept before calling Playwright's handler
- **Advantage**: Faster MVP, easier testing, no upstream dependency

#### Option B: Full Core Integration
- Implement in `microsoft/playwright` monorepo
- Requires coordination with Playwright team
- **Advantage**: Better long-term architecture
- **Disadvantage**: Slower, requires separate PR

**For this MVP, use Option A** - we can refactor to Option B later.

---

## 📋 Implementation Checklist

### Phase 0: Environment Setup & Validation

- [ ] **Verify Prerequisites**
  ```bash
  # Node.js 18+ installed
  node --version
  
  # Playwright MCP repo cloned
  cd playwright-mcp
  npm install
  
  # Tests pass (baseline)
  npm test
  
  # Appium and Android SDK available (optional for local testing)
  appium --version  # If testing locally
  adb devices       # If testing with real device/emulator
  ```

- [ ] **Create Feature Branch**
  ```bash
  git checkout -b feat/android-mvp
  ```

- [ ] **Set Up Test Environment**
  - Android emulator running OR
  - Real Android device connected OR
  - Mock Appium responses for testing

### Phase 1: Add Dependencies

- [ ] **Update package.json**
  ```json
  {
    "dependencies": {
      "webdriverio": "^8.40.0"
    },
    "optionalDependencies": {
      "appium": "^2.11.0"
    }
  }
  ```

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **Verify Installation**
  ```bash
  npm list webdriverio
  ```

- [ ] **Commit**
  ```bash
  git add package.json package-lock.json
  git commit -m "feat(android): add webdriverio and appium dependencies"
  ```

### Phase 2: Create Directory Structure

- [ ] **Create Android Tools Directory**
  ```bash
  mkdir -p src/tools/android
  ```

- [ ] **Create Appium Client Module**
  - File: `src/appiumClient.js`
  - See [Code Skeleton: appiumClient.js](#code-skeleton-appiumclientjs)

- [ ] **Test Appium Connection** (if Appium available)
  ```bash
  # Start Appium server in separate terminal
  appium
  
  # Test connection with simple Node script
  node -e "const { getAppiumDriver } = require('./src/appiumClient'); getAppiumDriver().then(d => console.log('Connected:', d.sessionId)).catch(e => console.error(e))"
  ```

- [ ] **Commit**
  ```bash
  git add src/appiumClient.js
  git commit -m "feat(android): add Appium client connection module"
  ```

### Phase 3: Implement Android Tools

Implement each tool following the pattern in **ANDROID_MOBILE_SUPPORT.md**:

#### Tool 1: android_launch_app.js

- [ ] **Create File**: `src/tools/android/android_launch_app.js`
- [ ] **Implement Function**: See [Code Skeleton: android_launch_app.js](#code-skeleton-android_launch_appjs)
- [ ] **Add Input Validation**:
  - Require `packageName` OR `appPath`
  - Validate format
  - Error messages match Playwright patterns
- [ ] **Test Manually** (if possible):
  ```javascript
  const { android_launch_app } = require('./src/tools/android/android_launch_app');
  android_launch_app({ packageName: 'com.android.settings' });
  ```
- [ ] **Commit**:
  ```bash
  git add src/tools/android/android_launch_app.js
  git commit -m "feat(android): implement android_launch_app tool"
  ```

#### Tool 2: android_tap.js

- [ ] **Create File**: `src/tools/android/android_tap.js`
- [ ] **Implement Function**: See [Code Skeleton: android_tap.js](#code-skeleton-android_tapjs)
- [ ] **Support Both Modes**:
  - Selector-based tap (with translation)
  - Coordinate-based tap (x, y)
- [ ] **Test Manually**
- [ ] **Commit**

#### Tool 3: android_input_text.js

- [ ] **Create File**: `src/tools/android/android_input_text.js`
- [ ] **Implement Function**: See [Code Skeleton: android_input_textjs]
(#code-skeleton-android_input_textjs)
- [ ] **Handle Clear Option**
- [ ] **Test Manually**
- [ ] **Commit**

#### Tool 4: android_screenshot.js

- [ ] **Create File**: `src/tools/android/android_screenshot.js`
- [ ] **Implement Function**: See [Code Skeleton: android_screenshotjs](#code-skeleton-android_screenshotjs)
- [ ] **Support Both Modes**:
  - Full screen screenshot
  - Element screenshot
- [ ] **Test Manually**
- [ ] **Commit**

#### Utils Module

- [ ] **Create File**: `src/tools/android/utils.js`
- [ ] **Implement**: See [Code Skeleton: utils.js](#code-skeleton-utilsjs)
  - `translateSelector()` - Playwright → Android selector
  - `waitForElement()` - Automatic waiting with timeout
- [ ] **Test Selector Translation**:
  ```javascript
  const { translateSelector } = require('./src/tools/android/utils');
  console.log(translateSelector('#login'));          // ~login
  console.log(translateSelector('text=Submit'));     // //*[@text='Submit']
  console.log(translateSelector('[data-testid="btn"]')); // ~btn
  ```
- [ ] **Commit**

### Phase 4: Add Handler Routing

This is the **CRITICAL INTEGRATION POINT**.

- [ ] **Identify Handler Location**
  - Check `index.js` - this is the wrapper entry point
  - Handler logic may be in `cli.js` or called from Playwright core

- [ ] **Add Routing Logic**
  
  Option A: Intercept in `index.js` (wrapper approach):
  ```javascript
  // In index.js or appropriate wrapper file
  const androidTools = require('./src/tools/android');
  
  async function handleToolCall(toolName, params) {
    const target = params.target || 'web';
    
    if (target === 'android') {
      // Route to Android tools
      const toolMap = {
        'android_launch_app': androidTools.android_launch_app,
        'android_tap': androidTools.android_tap,
        'android_input_text': androidTools.android_input_text,
        'android_screenshot': androidTools.android_screenshot,
      };
      
      if (!toolMap[toolName]) {
        throw new Error(`Unknown Android tool: ${toolName}`);
      }
      
      return await toolMap[toolName](params);
    }
    
    // Default: route to existing Playwright web handler
    return await playwrightWebHandler(toolName, params);
  }
  ```

- [ ] **Create Index File for Android Tools**
  - File: `src/tools/android/index.js`
  ```javascript
  const { android_launch_app } = require('./android_launch_app');
  const { android_tap } = require('./android_tap');
  const { android_input_text } = require('./android_input_text');
  const { android_screenshot } = require('./android_screenshot');
  
  module.exports = {
    android_launch_app,
    android_tap,
    android_input_text,
    android_screenshot,
  };
  ```

- [ ] **Verify Web Tools Still Work**
  ```bash
  npm run ctest  # Run Chrome tests
  ```

- [ ] **Commit**
  ```bash
  git add src/tools/android/index.js index.js  # Or wherever routing was added
  git commit -m "feat(android): add handler routing for Android tools"
  ```

### Phase 5: Write Integration Tests

**⚠️ CRITICAL**: Tests are NOT optional - they validate your implementation.

Follow patterns from `tests/fixtures.ts` and existing test files.

#### Test File Structure

- [ ] **Create Test File**: `tests/android.spec.ts`

- [ ] **Set Up Test Fixtures**
  ```typescript
  import { test, expect } from './fixtures';
  
  test.describe('Android Tools', () => {
    // Tests go here
  });
  ```

#### Test 1: Handler Routing

- [ ] **Test: Web tools still work (backward compatibility)**
  ```typescript
  test('web tools work without target parameter', async ({ client, server }) => {
    server.setContent('/', '<button id="test">Click</button>');
    
    const response = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX }
    });
    
    expect(response.isError).toBe(false);
  });
  ```

- [ ] **Test: Target parameter routing**
  ```typescript
  test('target=web routes to web handler', async ({ client, server }) => {
    server.setContent('/', '<button>Test</button>');
    
    const response = await client.callTool({
      name: 'browser_navigate',
      arguments: { 
        url: server.PREFIX,
        target: 'web'  // Explicit
      }
    });
    
    expect(response.isError).toBe(false);
  });
  ```

#### Test 2: Android Tool - Launch App (Mocked)

- [ ] **Test with Mock Appium**
  ```typescript
  test('android_launch_app with packageName', async ({ client }) => {
    // Note: This requires mocking Appium responses
    // OR running with actual Appium + emulator
    
    const response = await client.callTool({
      name: 'android_launch_app',
      arguments: {
        packageName: 'com.example.app',
        target: 'android'
      }
    });
    
    // Expect success response
    expect(response.isError).toBe(false);
    expect(response.content[0].text).toContain('Launched app');
  });
  ```

#### Test 3: Android Tool - Tap (Mocked)

- [ ] **Test selector-based tap**
  ```typescript
  test('android_tap with selector', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_tap',
      arguments: {
        selector: '#submit-button',
        target: 'android'
      }
    });
    
    expect(response.isError).toBe(false);
  });
  ```

- [ ] **Test coordinate-based tap**
  ```typescript
  test('android_tap with coordinates', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_tap',
      arguments: {
        x: 100,
        y: 200,
        target: 'android'
      }
    });
    
    expect(response.isError).toBe(false);
  });
  ```

#### Test 4: Android Tool - Input Text (Mocked)

- [ ] **Test text input**
  ```typescript
  test('android_input_text', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_input_text',
      arguments: {
        selector: '#username',
        text: 'testuser',
        target: 'android'
      }
    });
    
    expect(response.isError).toBe(false);
  });
  ```

#### Test 5: Android Tool - Screenshot (Mocked)

- [ ] **Test screenshot**
  ```typescript
  test('android_screenshot', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_screenshot',
      arguments: {
        target: 'android'
      }
    });
    
    expect(response.isError).toBe(false);
    // Should return base64 screenshot
  });
  ```

#### Test 6: Error Handling

- [ ] **Test invalid tool name**
  ```typescript
  test('invalid Android tool returns error', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_invalid_tool',
      arguments: {
        target: 'android'
      }
    });
    
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Unknown Android tool');
  });
  ```

- [ ] **Test missing required parameters**
  ```typescript
  test('android_launch_app without packageName errors', async ({ client }) => {
    const response = await client.callTool({
      name: 'android_launch_app',
      arguments: {
        target: 'android'
        // Missing packageName and appPath
      }
    });
    
    expect(response.isError).toBe(true);
  });
  ```

### Phase 6: Test Execution & Validation

- [ ] **Run New Android Tests**
  ```bash
  # Run just Android tests
  npx playwright test tests/android.spec.ts --project=chrome
  ```

- [ ] **Run Full Test Suite**
  ```bash
  # Verify no regressions
  npm test
  ```

- [ ] **Fix Any Failures**
  - Debug failed tests
  - Update code as needed
  - Re-run tests until all pass

- [ ] **Commit Tests**
  ```bash
  git add tests/android.spec.ts
  git commit -m "test(android): add integration tests for Android tools"
  ```

### Phase 7: Manual Testing (If Appium Available)

If you have Appium and an Android device/emulator, perform manual validation:

- [ ] **Start Appium Server**
  ```bash
  appium
  ```

- [ ] **Start Android Emulator**
  ```bash
  emulator -avd Pixel_7_API_34
  # OR connect physical device
  adb devices
  ```

- [ ] **Test Each Tool Manually**
  
  Create test script `manual-test.js`:
  ```javascript
  const { createConnection } = require('./index.js');
  
  async function test() {
    const connection = await createConnection({
      // Config here
    });
    
    // Test launch
    await connection.callTool({
      name: 'android_launch_app',
      arguments: {
        packageName: 'com.android.settings',
        target: 'android'
      }
    });
    
    // Test tap
    await connection.callTool({
      name: 'android_tap',
      arguments: {
        x: 100,
        y: 100,
        target: 'android'
      }
    });
    
    // Test screenshot
    const screenshot = await connection.callTool({
      name: 'android_screenshot',
      arguments: {
        target: 'android'
      }
    });
    
    console.log('All manual tests passed!');
  }
  
  test().catch(console.error);
  ```

- [ ] **Run Manual Test**
  ```bash
  node manual-test.js
  ```

- [ ] **Document Results**
  - Screenshot of successful execution
  - Note any issues
  - Update code if needed

### Phase 8: Update Documentation

- [ ] **Update README.md**
  
  Add section "Experimental Android Support":
  ```markdown
  ## Experimental Android Support
  
  Playwright MCP now includes experimental support for Android mobile automation via Appium.
  
  ### Prerequisites
  
  - Appium server running (`npm install -g appium`)
  - Android SDK installed
  - Android device or emulator connected
  
  ### Environment Variables
  
  - `APPIUM_URL` - Appium server URL (default: `http://localhost:4723`)
  - `ANDROID_AVD` - Android Virtual Device name (optional)
  - `APP_PATH` - Path to APK file (optional)
  
  ### Available Tools
  
  1. **android_launch_app** - Launch Android application
  2. **android_tap** - Tap element or coordinates
  3. **android_input_text** - Input text into element
  4. **android_screenshot** - Capture screenshot
  
  ### Usage Example
  
  \`\`\`json
  {
    "tool": "android_tap",
    "arguments": {
      "selector": "#submit-button",
      "target": "android"
    }
  }
  \`\`\`
  
  All Android tools require `target: "android"` parameter.
  
  ### Limitations
  
  - External device management (not handled by MCP)
  - No iOS support in MVP
  - Experimental feature - subject to change
  ```

- [ ] **Update DOC_INDEX.md**
  - Add reference to Android implementation
  - Link to test examples

- [ ] **Update SUMMARY.md**
  - Note implementation completion
  - Update statistics

- [ ] **Commit Documentation**
  ```bash
  git add README.md DOC_INDEX.md SUMMARY.md
  git commit -m "docs(android): add Android MVP documentation to README"
  ```

### Phase 9: Code Review & Cleanup

- [ ] **Run Linter**
  ```bash
  npm run lint
  ```

- [ ] **Fix Linting Issues**

- [ ] **Self-Review Checklist**
  - [ ] All tests pass
  - [ ] No regression in web tools
  - [ ] Code follows existing patterns
  - [ ] Error messages match Playwright style
  - [ ] Selector translation works
  - [ ] Automatic waits implemented
  - [ ] No hardcoded sleeps exposed to agents
  - [ ] Documentation complete
  - [ ] Commit messages follow convention

- [ ] **Clean Up**
  - Remove any debug logging
  - Remove temporary files
  - Ensure `.gitignore` excludes test artifacts

### Phase 10: Final Validation

- [ ] **Full Test Suite**
  ```bash
  npm test
  ```

- [ ] **Test on Different Projects**
  ```bash
  npm run ctest  # Chrome
  npm run ftest  # Firefox
  npm run wtest  # WebKit
  ```

- [ ] **Check Bundle Size** (optional)
  ```bash
  npm pack --dry-run
  ```

- [ ] **Create Summary**
  - List all commits
  - Document what was implemented
  - Note any limitations or TODOs

---

## 🧪 Testing Strategy

### Test Pyramid for Android MVP

```
                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱     ╲
                ╱ Manual╲
               ╱ Testing ╲
              ╱───────────╲
             ╱             ╲
            ╱  Integration  ╲
           ╱     Tests       ╲
          ╱─────────────────────╲
         ╱                       ╲
        ╱        Unit Tests       ╲
       ╱     (Selector Translation)╲
      ╱───────────────────────────────╲
```

### Testing Levels

1. **Unit Tests** - Test individual functions
   - Selector translation (`utils.translateSelector`)
   - Parameter validation
   - Error message formatting

2. **Integration Tests** (via Playwright Test + MCP SDK)
   - Handler routing logic
   - Tool invocation via MCP protocol
   - Mock Appium responses
   - Error handling

3. **Manual Tests** (if Appium available)
   - Real device/emulator interaction
   - End-to-end workflows
   - Visual validation

### Mocking Strategy

Since Appium requires external setup, tests should support:

1. **Mock Mode** (default for CI)
   - Mock `getAppiumDriver()` to return fake driver
   - Simulate successful responses
   - Test error paths

2. **Real Mode** (optional, for local testing)
   - Connect to actual Appium server
   - Requires environment variable: `TEST_WITH_REAL_APPIUM=1`
   - Only runs if Appium is available

Example mock setup in `tests/android.spec.ts`:

```typescript
import { test, expect } from './fixtures';

// Mock Appium driver if not testing with real Appium
let mockAppiumDriver = null;

test.beforeAll(() => {
  if (!process.env.TEST_WITH_REAL_APPIUM) {
    // Set up mock
    mockAppiumDriver = {
      $: async (selector) => ({
        isDisplayed: async () => true,
        isEnabled: async () => true,
        click: async () => {},
      }),
      activateApp: async () => {},
      takeScreenshot: async () => 'base64screenshotdata',
    };
    
    // Inject mock
    jest.mock('../src/appiumClient', () => ({
      getAppiumDriver: async () => mockAppiumDriver
    }));
  }
});
```

---

## 📝 Code Skeletons

### Code Skeleton: appiumClient.js

```javascript
// src/appiumClient.js
const { remote } = require('webdriverio');

let driver = null;

async function getAppiumDriver() {
  if (driver) {
    return driver;
  }
  
  const appiumUrl = process.env.APPIUM_URL || 'http://localhost:4723';
  
  const options = {
    protocol: 'http',
    hostname: new URL(appiumUrl).hostname,
    port: parseInt(new URL(appiumUrl).port) || 4723,
    path: '/wd/hub',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE || 'Android Emulator',
      'appium:avd': process.env.ANDROID_AVD,
      // Don't launch app automatically - we'll do it via android_launch_app
      'appium:noReset': true,
    },
    logLevel: 'error',
  };
  
  try {
    driver = await remote(options);
    console.log('Appium driver connected:', driver.sessionId);
    return driver;
  } catch (error) {
    throw new Error(`Failed to connect to Appium: ${error.message}`);
  }
}

async function closeAppiumDriver() {
  if (driver) {
    await driver.deleteSession();
    driver = null;
  }
}

module.exports = { getAppiumDriver, closeAppiumDriver };
```

### Code Skeleton: android_launch_app.js

```javascript
// src/tools/android/android_launch_app.js
const { getAppiumDriver } = require('../../appiumClient');

async function android_launch_app(params) {
  const { packageName, appPath } = params;
  
  if (!packageName && !appPath) {
    throw new Error('android_launch_app requires either packageName or appPath parameter');
  }
  
  try {
    const driver = await getAppiumDriver();
    
    if (appPath) {
      // Install app from APK path
      console.log(`Installing app from: ${appPath}`);
      await driver.installApp(appPath);
    }
    
    if (packageName) {
      console.log(`Launching app: ${packageName}`);
      await driver.activateApp(packageName);
      
      // Wait for app to initialize
      await driver.pause(2000);
    }
    
    return {
      success: true,
      message: `Successfully launched app: ${packageName || appPath}`,
      packageName: packageName || 'unknown',
    };
  } catch (error) {
    throw new Error(`Failed to launch Android app: ${error.message}`);
  }
}

module.exports = { android_launch_app };
```

### Code Skeleton: android_tap.js

```javascript
// src/tools/android/android_tap.js
const { getAppiumDriver } = require('../../appiumClient');
const { translateSelector, waitForElement } = require('./utils');

async function android_tap(params) {
  const { selector, x, y } = params;
  
  if (!selector && (x === undefined || y === undefined)) {
    throw new Error('android_tap requires either selector or (x, y) coordinates');
  }
  
  try {
    const driver = await getAppiumDriver();
    
    if (x !== undefined && y !== undefined) {
      // Tap at coordinates
      console.log(`Tapping at coordinates: (${x}, ${y})`);
      await driver.touchAction([
        { action: 'tap', x, y }
      ]);
    } else {
      // Find and tap element
      console.log(`Tapping element: ${selector}`);
      const androidSelector = translateSelector(selector);
      const element = await waitForElement(driver, androidSelector);
      await element.click();
    }
    
    return {
      success: true,
      message: `Tapped ${selector || `(${x}, ${y})`}`,
    };
  } catch (error) {
    throw new Error(`Failed to tap: ${error.message}`);
  }
}

module.exports = { android_tap };
```

### Code Skeleton: android_input_text.js

```javascript
// src/tools/android/android_input_text.js
const { getAppiumDriver } = require('../../appiumClient');
const { translateSelector, waitForElement } = require('./utils');

async function android_input_text(params) {
  const { selector, text, clear = false } = params;
  
  if (!selector) {
    throw new Error('android_input_text requires selector parameter');
  }
  
  if (!text) {
    throw new Error('android_input_text requires text parameter');
  }
  
  try {
    const driver = await getAppiumDriver();
    const androidSelector = translateSelector(selector);
    
    console.log(`Inputting text into: ${selector}`);
    const element = await waitForElement(driver, androidSelector);
    
    if (clear) {
      await element.clearValue();
    }
    
    await element.setValue(text);
    
    return {
      success: true,
      message: `Input text into ${selector}`,
    };
  } catch (error) {
    throw new Error(`Failed to input text: ${error.message}`);
  }
}

module.exports = { android_input_text };
```

### Code Skeleton: android_screenshot.js

```javascript
// src/tools/android/android_screenshot.js
const { getAppiumDriver } = require('../../appiumClient');
const { translateSelector, waitForElement } = require('./utils');
const fs = require('fs');
const path = require('path');

async function android_screenshot(params) {
  const { path: screenshotPath, selector } = params;
  
  try {
    const driver = await getAppiumDriver();
    
    let screenshot;
    if (selector) {
      // Element screenshot
      console.log(`Taking screenshot of element: ${selector}`);
      const androidSelector = translateSelector(selector);
      const element = await waitForElement(driver, androidSelector);
      screenshot = await element.takeScreenshot();
    } else {
      // Full screen screenshot
      console.log('Taking full screen screenshot');
      screenshot = await driver.takeScreenshot();
    }
    
    if (screenshotPath) {
      // Save to file
      const fullPath = path.resolve(screenshotPath);
      fs.writeFileSync(fullPath, screenshot, 'base64');
      
      return {
        success: true,
        message: `Screenshot saved to ${fullPath}`,
        path: fullPath,
      };
    } else {
      // Return base64
      return {
        success: true,
        message: 'Screenshot captured',
        screenshot: screenshot,
        format: 'base64',
      };
    }
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error.message}`);
  }
}

module.exports = { android_screenshot };
```

### Code Skeleton: utils.js

```javascript
// src/tools/android/utils.js

/**
 * Translate Playwright selector to Android/Appium selector
 * 
 * Mappings:
 * - #id → ~id (accessibility ID)
 * - [data-testid="value"] → ~value (accessibility ID via content-desc)
 * - text=Value → //*[@text='Value'] (XPath)
 * - .class → //*[contains(@class, 'class')] (XPath)
 */
function translateSelector(playwrightSelector) {
  if (!playwrightSelector) {
    throw new Error('Selector is required');
  }
  
  // ID selector (#id) → accessibility ID (~id)
  if (playwrightSelector.startsWith('#')) {
    const id = playwrightSelector.slice(1);
    return `~${id}`;
  }
  
  // Test ID selector ([data-testid="value"]) → accessibility ID (~value)
  const testIdMatch = playwrightSelector.match(/\[data-testid=["']([^"']+)["']\]/);
  if (testIdMatch) {
    return `~${testIdMatch[1]}`;
  }
  
  // Text selector (text=Value) → XPath
  if (playwrightSelector.startsWith('text=')) {
    const text = playwrightSelector.slice(5);
    return `//*[@text='${text}']`;
  }
  
  // Class selector (.class) → XPath
  if (playwrightSelector.startsWith('.')) {
    const className = playwrightSelector.slice(1);
    return `//*[contains(@class, '${className}')]`;
  }
  
  // Role selector (button) → XPath with class
  if (!playwrightSelector.includes('[') && !playwrightSelector.includes('#')) {
    return `//*[contains(@class, '${playwrightSelector}')]`;
  }
  
  // Fallback: treat as accessibility ID
  return `~${playwrightSelector}`;
}

/**
 * Wait for element to be visible and enabled
 * 
 * @param {WebDriver} driver - WebdriverIO driver instance
 * @param {string} selector - Android selector
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Element>} - Element when ready
 */
async function waitForElement(driver, selector, timeout = 30000) {
  const startTime = Date.now();
  let lastError = null;
  
  while (Date.now() - startTime < timeout) {
    try {
      const element = await driver.$(selector);
      
      if (await element.isDisplayed() && await element.isEnabled()) {
        return element;
      }
      
      lastError = new Error('Element not displayed or not enabled');
    } catch (error) {
      lastError = error;
    }
    
    // Wait 100ms before retry
    await driver.pause(100);
  }
  
  throw new Error(
    `Timeout ${timeout}ms exceeded waiting for element "${selector}": ${lastError?.message || 'Element not found'}`
  );
}

module.exports = { translateSelector, waitForElement };
```

---

## ✅ Success Criteria

Your implementation is complete when ALL of the following are true:

- [ ] All 4 Android tools implemented (`android_launch_app`, `android_tap`, `android_input_text`, `android_screenshot`)
- [ ] Handler routing logic added and working
- [ ] Selector translation working for common patterns
- [ ] Automatic waits implemented (no exposed sleeps)
- [ ] All tests pass (`npm test`)
- [ ] At least 10 integration tests written and passing
- [ ] No regression in web tools (existing tests still pass)
- [ ] README.md updated with Android section
- [ ] Code follows existing patterns and conventions
- [ ] Commit messages follow semantic format
- [ ] Error messages match Playwright patterns
- [ ] Code is clean (no debug logs, no TODOs in production code)
- [ ] Manual testing performed (if Appium available) OR comprehensive mocks
- [ ] Documentation complete and accurate

---

## 🚨 Common Pitfalls

### 1. Breaking Existing Web Tools

**Problem**: Adding Android routing breaks web automation.

**Solution**: Always default to `web` when `target` is missing. Test web tools after every change.

### 2. Hardcoded Waits

**Problem**: Using `await driver.pause(5000)` everywhere.

**Solution**: Implement `waitForElement()` utility. Only use pause for app initialization.

### 3. Forgetting to Test

**Problem**: Code works locally but no tests, breaks in CI.

**Solution**: Write tests BEFORE marking task complete. Use mocks if no Appium.

### 4. Incorrect Selector Translation

**Problem**: Playwright selectors don't work on Android.

**Solution**: Test each selector type. Add comprehensive unit tests for `translateSelector()`.

### 5. Missing Error Handling

**Problem**: Cryptic errors when Appium not available.

**Solution**: Clear error messages. Check Appium connection early.

---

## 🎓 Learning Resources

- **WebdriverIO Docs**: https://webdriver.io/docs/api
- **Appium Docs**: https://appium.io/docs/en/latest/
- **Android UiAutomator2**: https://github.com/appium/appium-uiautomator2-driver
- **MCP SDK**: https://modelcontextprotocol.io/
- **Playwright Test**: https://playwright.dev/docs/test-intro

---

## 📞 Getting Help

If you get stuck:

1. **Review Documentation**
   - Re-read ANDROID_MOBILE_SUPPORT.md
   - Check BEST_PRACTICES.md for patterns
   - Look at existing tests in `tests/` directory

2. **Debug Systematically**
   - Add logging to understand flow
   - Test each component independently
   - Use Playwright Test UI mode: `npx playwright test --ui`

3. **Check Assumptions**
   - Is Appium running?
   - Is device connected?
   - Are dependencies installed?

4. **Ask for Help**
   - Provide error messages
   - Share what you've tried
   - Include relevant code snippets

---

## 🎯 Final Checklist Before Submission

- [ ] **Code Quality**
  - [ ] All tests pass
  - [ ] Linter passes
  - [ ] No console.log in production code (use debug library if needed)
  - [ ] No commented-out code
  - [ ] No TODOs in production code

- [ ] **Testing**
  - [ ] Integration tests cover all 4 tools
  - [ ] Error cases tested
  - [ ] Backward compatibility tested
  - [ ] Manual testing done OR comprehensive mocks

- [ ] **Documentation**
  - [ ] README.md updated
  - [ ] Code comments for complex logic
  - [ ] Commit messages follow convention

- [ ] **Architecture**
  - [ ] Follows single-handler pattern
  - [ ] Web tools still work
  - [ ] Selector translation transparent
  - [ ] No breaking changes

- [ ] **Git History**
  - [ ] Commits are atomic
  - [ ] Commit messages descriptive
  - [ ] No merge commits (rebase if needed)

---

## 🎉 Conclusion

You now have everything you need to implement and test the Android MVP. Remember:

1. **Read the documentation first**
2. **Follow existing patterns**
3. **Test continuously**
4. **Commit incrementally**
5. **Don't break existing functionality**

Good luck! 🚀

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-01  
**Related Docs**: [ANDROID_MOBILE_SUPPORT.md](ANDROID_MOBILE_SUPPORT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [BEST_PRACTICES.md](BEST_PRACTICES.md)
