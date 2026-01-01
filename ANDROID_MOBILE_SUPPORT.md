# Playwright MCP Android Mobile Support – Design & Implementation Plan

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Design](#architecture-design)
3. [Implementation Goals](#implementation-goals)
4. [MVP Scope (2-Day)](#mvp-scope-2-day)
5. [Technical Approach](#technical-approach)
6. [Code Skeleton](#code-skeleton)
7. [Success Criteria](#success-criteria)
8. [Future Roadmap](#future-roadmap)

---

## Project Overview

We are extending the existing Playwright MCP server to provide **first-class, minimal Android mobile support** while fully preserving Playwright parity for existing web commands. The core principle is to maintain a clean architecture where all agent commands flow through a single `playwrightHandler` that routes based on target platform—either executing standard web Playwright commands or routing through a new Appium-based mobile driver for Android.

### Key Principles

- **Single Handler Architecture**: All commands flow through `playwrightHandler`
- **Playwright Parity**: Web automation behavior remains unchanged
- **Opt-In Mobile Support**: Mobile features are isolated and optional
- **Clean Separation**: Mobile-specific tools under separate namespace
- **Transparent Selector Translation**: Playwright selectors mapped internally to Android accessibility IDs/test IDs/XPath
- **Internal Flakiness Mitigation**: Automatic waits, retries—no exposed sleeps
- **External Device Management**: MCP connects to existing emulators/devices; lifecycle managed externally

---

## Architecture Design

### High-Level Flow

```
Agent Command
    ↓
playwrightHandler (routing layer)
    ↓
    ├─ target: 'web' → Playwright Driver (existing)
    │   └─ Standard Playwright commands
    │
    └─ target: 'android' → Appium Driver (new)
        └─ Mobile-specific tools + Playwright-compatible commands
```

### Component Structure

```
playwright-mcp/
├─ src/
│  ├─ playwrightHandler.js      # Main routing handler
│  ├─ webHandler.js              # Existing Playwright web logic
│  ├─ appiumClient.js            # Appium connection manager
│  └─ tools/
│     ├─ web/                    # Existing web tools
│     └─ mobile/
│        └─ android/
│           ├─ android_launch_app.js
│           ├─ android_tap.js
│           ├─ android_input_text.js
│           └─ android_screenshot.js
```

### Routing Logic

- Commands include `target` parameter (`web` | `android`)
- Default: `web`
- Android commands routed to Appium driver
- Web commands continue using Playwright unchanged
- Selector translation happens internally (transparent to agents)

---

## Implementation Goals

### Primary Goals

1. **Minimal Android Support (MVP)**
   - Implement four essential tools: `android_launch_app`, `android_tap`, `android_input_text`, `android_screenshot`
   - Enable agents to run basic Android automation flows
   - No iOS support required initially

2. **Preserve Playwright Parity**
   - All existing Playwright commands must behave identically
   - Standard commands (click, fill, waitForSelector, screenshot, evaluate) work on both web and mobile
   - No new selector syntax exposed to agents
   - Internal mapping: Playwright selectors → accessibility IDs, test IDs, or fallback XPath

3. **Automatic Reliability**
   - Commands automatically wait for element existence, visibility, enablement
   - No hardcoded sleeps exposed to agents
   - Timeouts and errors mirror Playwright behavior
   - Retry logic built-in for flaky operations

4. **Clean PR Surface**
   - Small, focused commits
   - No cloud dependencies
   - No device lifecycle management in MCP
   - Minimal README updates with usage examples
   - Reviewable and mergeable upstream

5. **Forward Compatibility**
   - Architecture supports headless emulators without code changes
   - Can extend to CI environments
   - Room for future device capabilities
   - Optional future iOS support path

### Non-Goals (Out of Scope for This PR)

- ❌ iOS support
- ❌ Device lifecycle management (starting/stopping emulators)
- ❌ Cloud device integration
- ❌ CI/CD pipeline integration
- ❌ Headless emulator orchestration
- ❌ Multi-device parallel execution

---

## MVP Scope (2-Day)

### Four Core Tools

1. **android_launch_app**
   - Launch Android app by package name or app path
   - Wait for app initialization
   - Return success/failure status

2. **android_tap**
   - Tap element by Playwright-style selector or coordinates
   - Automatic wait for element
   - Support accessibility IDs, test IDs, XPath fallback

3. **android_input_text**
   - Input text into element
   - Clear existing text if requested
   - Handle keyboard visibility

4. **android_screenshot**
   - Capture full device screenshot
   - Return base64 or save to file
   - Support element-specific screenshots

### Assumptions

- Appium server running externally (localhost:4723)
- Android emulator or real device already started
- App APK installed on device
- Environment variables configure connection:
  - `ANDROID_AVD`: Emulator name
  - `APP_PATH`: Path to APK
  - `APPIUM_URL`: Appium server URL (default: http://localhost:4723/wd/hub)

---

## Technical Approach

### 1. Handler Routing

```javascript
// playwrightHandler.js
async function playwrightHandler(tool) {
    const target = tool.target || 'web';
    
    if (target === 'android') {
        // Route to Android/Appium tools
        if (!androidTools[tool.name]) {
            throw new Error(`Unknown Android tool: ${tool.name}`);
        }
        return await androidTools[tool.name].run(tool.parameters);
    } else {
        // Default web handling (existing Playwright)
        if (!webHandler[tool.name]) {
            throw new Error(`Unknown Web tool: ${tool.name}`);
        }
        return await webHandler[tool.name].run(tool.parameters);
    }
}
```

### 2. Selector Translation

Internal mapping (transparent to agents):

| Playwright Selector | Android Mapping |
|---------------------|-----------------|
| `#login-button` | `~login-button` (accessibility ID) |
| `[data-testid="submit"]` | `~submit` (test ID via content-desc) |
| `.button` | XPath fallback with class matching |
| `text=Login` | XPath with text matching: `//*[@text='Login']` |

### 3. Automatic Waits

```javascript
// Internal wait mechanism (not exposed to agents)
async function waitForElement(selector, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const element = await driver.$(selector);
            if (await element.isDisplayed() && await element.isEnabled()) {
                return element;
            }
        } catch (e) {
            // Element not found yet, continue waiting
        }
        await sleep(100);
    }
    throw new Error(`Timeout waiting for element: ${selector}`);
}
```

### 4. Error Handling

- Mirror Playwright error messages and behavior
- Timeout errors consistent with Playwright
- Clear error messages for agents
- Stack traces preserved for debugging

---

## Code Skeleton

### playwrightHandler.js – Android Routing Skeleton

```javascript
// playwrightHandler.js
const { webHandler } = require('./webHandler');
const { androidTools } = require('./tools/mobile/android');

async function playwrightHandler(tool) {
    const target = tool.target || 'web';

    if (target === 'android') {
        if (!androidTools[tool.name]) {
            throw new Error(`Unknown Android tool: ${tool.name}`);
        }
        // Route to Appium-backed tool
        return await androidTools[tool.name].run(tool.parameters);
    } else {
        // Default web handling
        if (!webHandler[tool.name]) {
            throw new Error(`Unknown Web tool: ${tool.name}`);
        }
        return await webHandler[tool.name].run(tool.parameters);
    }
}

module.exports = { playwrightHandler };
```

### Mobile Tools Structure

```
tools/mobile/android/
├─ android_launch_app.js
├─ android_tap.js
├─ android_input_text.js
└─ android_screenshot.js
```

### Example Tool: android_tap.js

```javascript
// android_tap.js
const { appiumDriver } = require('../../../appiumClient');

module.exports = {
    name: 'android_tap',
    description: 'Tap a specific element on Android app',
    parameters: {
        selector: 'string', // Playwright-style selector
        x: 'number',        // optional coordinate fallback
        y: 'number'
    },
    run: async function(params) {
        // Resolve selector internally (transparent to agent)
        const element = await appiumDriver.findElement(params.selector);
        
        // Automatic wait for element
        await element.waitForDisplayed({ timeout: 30000 });
        await element.waitForEnabled({ timeout: 5000 });
        
        // Perform tap
        if (params.x !== undefined && params.y !== undefined) {
            // Coordinate-based tap
            await appiumDriver.touchPerform([
                { action: 'tap', options: { x: params.x, y: params.y } }
            ]);
        } else {
            // Element-based tap
            await element.click();
        }
        
        return { success: true };
    }
};
```

### Appium Client Stub

```javascript
// appiumClient.js
const { remote } = require('webdriverio');

let driver = null;

async function getDriver() {
    if (driver) return driver;
    
    driver = await remote({
        path: '/wd/hub',
        port: 4723,
        capabilities: {
            platformName: 'Android',
            deviceName: process.env.ANDROID_AVD || 'Pixel_5_API_33',
            automationName: 'UiAutomator2',
            app: process.env.APP_PATH || '/path/to/app.apk',
            noReset: true,
            fullReset: false
        }
    });
    
    return driver;
}

module.exports = { getDriver, get appiumDriver() { return getDriver(); } };
```

---

## Usage Examples

### Basic Agent Command (Web - Unchanged)

```json
{
  "tool": "playwright_click",
  "parameters": { 
    "selector": "#login-button" 
  }
}
```

### Android Mobile Command

```json
{
  "tool": "android_tap",
  "parameters": { 
    "selector": "#login-button" 
  },
  "target": "android"
}
```

### Android App Launch

```json
{
  "tool": "android_launch_app",
  "parameters": { 
    "packageName": "com.example.app" 
  },
  "target": "android"
}
```

### Android Text Input

```json
{
  "tool": "android_input_text",
  "parameters": { 
    "selector": "#username",
    "text": "test@example.com"
  },
  "target": "android"
}
```

### Android Screenshot

```json
{
  "tool": "android_screenshot",
  "parameters": { 
    "path": "./screenshots/home.png" 
  },
  "target": "android"
}
```

---

## Success Criteria

### Functional Requirements

✅ Agents can execute basic Android flows using MCP tools  
✅ Existing web Playwright functionality unaffected  
✅ Mobile capabilities clearly separated and documented  
✅ No hardcoded sleeps—automatic waits work reliably  
✅ Playwright selectors work on Android without syntax changes  
✅ Error messages and timeouts consistent with Playwright behavior  

### Code Quality

✅ PR is small, focused, and reviewable  
✅ Commits are atomic and clearly scoped  
✅ Code follows existing Playwright MCP patterns  
✅ No breaking changes to existing APIs  
✅ Tests validate core Android functionality  

### Documentation

✅ README section for "Experimental Android Target"  
✅ Usage examples for all four MVP tools  
✅ Environment variable configuration documented  
✅ Limitations and assumptions clearly stated  

---

## Future Roadmap

### Phase 2 – Enhanced Mobile Support

- Additional gestures: swipe, scroll, pinch, rotate
- Device state commands: orientation, airplane mode, network throttling
- Multi-element interactions
- Advanced selector strategies

### Phase 3 – CI/CD Integration

- Headless emulator orchestration
- Parallel device execution
- Cloud device provider integration (BrowserStack, Sauce Labs, Firebase Test Lab)
- CI pipeline templates

### Phase 4 – iOS Support

- iOS tooling parallel to Android
- Unified mobile API surface
- XCUITest integration
- Simulator management

### Phase 5 – Advanced Features

- Visual regression testing
- Performance metrics collection
- Network mocking and interception
- Biometric authentication simulation
- Deep linking and push notification testing

---

## Design Decisions & Rationale

### Why Single Handler?

- **Consistency**: All commands flow through one entry point
- **Maintainability**: Easier to debug and extend
- **Transparency**: Agents see unified API surface

### Why External Device Management?

- **Simplicity**: MCP stays focused on automation, not orchestration
- **Flexibility**: Users choose their emulator/device setup
- **Reviewability**: Smaller PR surface, easier to merge

### Why Playwright Selector Compatibility?

- **Agent Familiarity**: Agents already know Playwright selectors
- **No Learning Curve**: Zero syntax changes for agents
- **Seamless Migration**: Web flows translate to mobile naturally

### Why Opt-In Mobile Tools?

- **Safety**: Existing workflows unaffected
- **Clarity**: Mobile-specific capabilities explicitly named
- **Extensibility**: Easy to add new mobile-only features

---

## Overarching Objective

The goal is to deliver a **single handler architecture** with:

- ✅ **Clean separation of concerns**: Web and mobile isolated but unified
- ✅ **Full Playwright parity**: Agents experience consistent behavior
- ✅ **Optional extended mobile tools**: Clearly namespaced, opt-in
- ✅ **Predictable automation**: Automatic waits, no flakiness
- ✅ **Reviewable PR**: Small, focused, mergeable
- ✅ **Foundation for scaling**: CI, iOS, cloud devices in future

This architecture ensures **long-term maintainability** and the ability to expand capabilities without breaking the current Playwright experience. Every action an agent requests—click, fill, waitForSelector, screenshot—behaves consistently across web and mobile targets. Mobile-specific commands are opt-in and documented. Flakiness is mitigated internally. Selector translation is transparent and safe. The architecture is forward-compatible with additional platforms, devices, and optional future features.

---

## Instructions for Copilot

When implementing this design:

1. **Generate code** following the skeletons provided above
2. **Maintain Playwright parity**: Never break existing web behavior
3. **Keep commits small**: Each tool in a separate commit if possible
4. **Write clear tests**: Validate core functionality for each tool
5. **Document minimally**: README updates focused on usage, not implementation
6. **Handle errors gracefully**: Mirror Playwright error patterns
7. **Implement automatic waits**: No exposed sleep commands
8. **Translate selectors internally**: Agents use Playwright syntax
9. **Assume external devices**: MCP connects, doesn't manage lifecycle
10. **Design for extensibility**: Architecture supports future enhancements

This document provides complete context for all development on the Android MCP extension, ensuring alignment with goals, priorities, and architectural decisions.
