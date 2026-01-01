# Playwright MCP Android Mobile Support – Agent Implementation Guide

## Table of Contents

1. [Context & Mission](#context--mission)
2. [Core Architecture Decision](#core-architecture-decision)
3. [Investigation Phase](#investigation-phase)
4. [Implementation Requirements](#implementation-requirements)
5. [Critical Constraints](#critical-constraints)
6. [Key Architecture Points](#key-architecture-points)
7. [Validation Steps](#validation-steps)
8. [Success Criteria](#success-criteria)
9. [Implementation Details](#implementation-details)
10. [Example Usage](#example-usage)

---

## Context & Mission

You are implementing minimal Android mobile automation support for the `playwright-mcp` repository. This document contains all architectural decisions, goals, and implementation details needed to add Android support while maintaining full backward compatibility with existing web automation.

### Your Mission

Implement MVP Android mobile support with these four tools:
1. `android_launch_app` - Launch Android app
2. `android_tap` - Tap element or coordinates
3. `android_input_text` - Input text into element
4. `android_screenshot` - Capture screenshot

---

## Core Architecture Decision

**⚠️ CRITICAL: ALL commands must flow through the Playwright handler.**

The handler will route based on a `target` parameter:
- `target: 'web'` (default) → existing Playwright web automation
- `target: 'android'` → new Appium-based Android automation

This single-handler architecture ensures:
- Unified command interface for agents
- Backward compatibility (web is default)
- Clean separation between web and mobile
- Consistent error handling and behavior

**There is ONE handler. All tools go through it. The handler routes based on target.**

### Key Principles

- **Single Handler Architecture**: All commands flow through the Playwright handler
- **Playwright Parity**: Web automation behavior remains unchanged
- **Opt-In Mobile Support**: Mobile features are isolated and optional
- **Clean Separation**: Mobile-specific tools under separate namespace
- **Transparent Selector Translation**: Playwright selectors mapped internally to Android accessibility IDs/test IDs/XPath
- **Internal Flakiness Mitigation**: Automatic waits, retries—no exposed sleeps
- **External Device Management**: MCP connects to existing emulators/devices; lifecycle managed externally

---

## Investigation Phase

### 1. Understand Current Playwright Handler Architecture

**Primary focus**: Find where the Playwright handler is defined (likely `index.js` or separate handler file)

Key questions to answer:
- How are tools currently registered and dispatched in the handler?
- What's the handler's signature and how does it process tool calls?
- How does it currently route to different Playwright tools?
- What's the error handling pattern?

### 2. Identify Handler Integration Points

Critical investigation areas:
- **Where exactly is the main Playwright handler function?**
- How do tool calls reach the handler (MCP server → handler flow)?
- What's the tool call structure (parameters, target, etc.)?
- How are tools currently discovered and registered?
- Can we add a routing layer **inside** the handler without breaking existing code?

### 3. Design Handler Modification Strategy

Implementation approach:
- Add `target` parameter detection at the **top of the handler**
- Route to Android tools when `target === 'android'`
- Default to existing web Playwright logic for all other cases
- Keep Android tools completely separate from web tools
- Ensure zero impact on existing web tool execution paths

---

## Implementation Requirements

### Phase 1: Setup & Dependencies

1. **Add required dependencies to `package.json`**:
   ```json
   {
     "dependencies": {
       "webdriverio": "^8.x.x",
       "appium": "^2.x.x"
     }
   }
   ```
   - `webdriverio` - For Appium client
   - `appium` - Peer dependency, optional (not bundled)

2. **Create directory structure**:
   ```
   src/tools/mobile/android/
   ```

3. **Create `src/appiumClient.js`** with connection logic

### Phase 2: Modify Playwright Handler for Routing

**⚠️ This is the critical phase.**

1. **Locate the Playwright handler** (likely in `index.js` or a dedicated handler file)

2. **Add routing logic at the handler entry point**:
   ```javascript
   async function playwrightHandler(toolCall) {
       const target = toolCall.target || 'web';
       
       if (target === 'android') {
           // Route to Android/Appium tools
           return await handleAndroidTool(toolCall);
       }
       
       // Existing web Playwright logic continues unchanged
       // ... existing handler code ...
   }
   ```

3. **Keep existing web logic completely untouched** - only add the Android branch

4. **Create `handleAndroidTool` function** that dispatches to Android-specific tools

5. **Ensure backward compatibility** - all existing tool calls work exactly as before

### Phase 3: Four MVP Tools

Implement each tool in `src/tools/mobile/android/`:

#### Tool 1: android_launch_app.js
- **Parameters**: `packageName` or `appPath`
- Wait for app to initialize
- Return success/failure

#### Tool 2: android_tap.js
- **Parameters**: `selector` (Playwright-style) OR `x, y` coordinates
- Translate selector to Android format internally
- Wait for element visibility and enabled state
- Perform tap action

#### Tool 3: android_input_text.js
- **Parameters**: `selector`, `text`, optional `clear`
- Find element, wait for it
- Clear if requested, then input text
- Handle keyboard visibility

#### Tool 4: android_screenshot.js
- **Parameters**: optional `path`, optional `selector` (for element screenshot)
- Capture screenshot
- Return base64 or save to file

**Each tool must include**:
- Automatic element waiting (30s timeout)
- Playwright selector translation (internal, transparent)
- Error messages matching Playwright patterns
- Proper parameter validation

### Phase 4: Documentation

1. Add "Experimental Android Support" section to README.md
2. Include usage examples showing the `target` parameter
3. Document environment variables:
   - `ANDROID_AVD` - Emulator name
   - `APP_PATH` - Path to APK
   - `APPIUM_URL` - Appium server URL (default: http://localhost:4723)
4. State assumptions clearly (external device/emulator management)

---

## Critical Constraints

### ❌ DO NOT
- Break existing web Playwright functionality
- Create a separate handler - use the existing Playwright handler
- Modify existing tool signatures or behavior
- Add device lifecycle management
- Expose sleep/wait commands to agents
- Create new selector syntax for agents

### ✅ DO
- Add routing logic to the Playwright handler
- Make Android tools completely separate from web tools
- Implement automatic waits internally
- Translate selectors transparently
- Keep commits small and focused
- Default to web when no target specified

---

## Key Architecture Points

1. **Single Handler**: All commands (web + Android) flow through the Playwright handler
2. **Target-Based Routing**: Handler checks `target` parameter and routes accordingly
3. **Separation**: Android tools live in `src/tools/mobile/android/`, never mixed with web
4. **Backward Compatibility**: Default behavior unchanged - web tools work exactly as before
5. **Opt-In**: Android only used when explicitly specified via `target: 'android'`

### Architecture Flow Diagram

```
Agent Command
    ↓
MCP Server
    ↓
Playwright Handler (SINGLE ENTRY POINT)
    ↓
    ├─ Check target parameter
    │
    ├─ target === 'android' ?
    │   ↓
    │   YES → handleAndroidTool()
    │         ↓
    │         Route to tools/mobile/android/*
    │         ↓
    │         android_launch_app.js
    │         android_tap.js
    │         android_input_text.js
    │         android_screenshot.js
    │
    └─ NO (or target === 'web')
        ↓
        Existing Playwright web logic (UNCHANGED)
        ↓
        Existing web tools
```

**Remember**: The handler is the key integration point. All commands flow through it. Your job is to add a clean routing layer that directs Android commands to new tools while preserving all existing web behavior.

---

## Validation Steps

After implementation:
1. Verify existing web tools still work unchanged
2. Test handler routing logic for both web and Android targets
3. Verify each Android tool independently
4. Confirm selector translation works correctly
5. Check automatic waits prevent flakiness
6. Validate error messages match Playwright patterns
7. Test edge cases (missing target, invalid target, etc.)

---

## Success Criteria

- [ ] Handler modified to route based on `target` parameter
- [ ] All four Android tools implemented and functional
- [ ] Routing logic cleanly separates web and Android
- [ ] No breaking changes to existing web tools
- [ ] Automatic waits work reliably (no hardcoded sleeps)
- [ ] Playwright selectors work on Android without syntax changes
- [ ] Documentation updated with usage examples showing `target` parameter
- [ ] Code follows existing patterns and conventions
- [ ] Commits are small, atomic, and reviewable

---

## Implementation Details

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

### Routing Logic Implementation

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

### Selector Translation

Internal mapping (transparent to agents):

| Playwright Selector | Android Mapping |
|---------------------|-----------------|
| `#login-button` | `~login-button` (accessibility ID) |
| `[data-testid="submit"]` | `~submit` (test ID via content-desc) |
| `.button` | XPath fallback with class matching |
| `text=Login` | XPath with text matching: `//*[@text='Login']` |

### Automatic Waits

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

### Error Handling

- Mirror Playwright error messages and behavior
- Timeout errors consistent with Playwright
- Clear error messages for agents
- Stack traces preserved for debugging

---

## Example Usage

### Web Command (Existing - Unchanged)
```json
{
  "tool": "playwright_click",
  "parameters": { 
    "selector": "#login-button" 
  }
}
```

### Android Command (New)
```json
{
  "tool": "android_tap",
  "parameters": { 
    "selector": "#login-button" 
  },
  "target": "android"
}
```

Both go through the same handler. The handler routes based on `target`.

---

## Start Here - Implementation Checklist

1. ✅ Read this document thoroughly
2. ⬜ **Find the Playwright handler** - this is your primary integration point
3. ⬜ Understand how the handler currently processes tool calls
4. ⬜ Design minimal routing modification to the handler
5. ⬜ Implement Android tools as separate, isolated modules
6. ⬜ Test incrementally at each step
7. ⬜ Keep the PR small and reviewable

---

## Deliverables

1. Modified Playwright handler with routing logic
2. Working code for all four MVP Android tools
3. Updated README.md with Android section
4. Clean commit history with focused changes
5. (Optional) Basic tests validating functionality

---

## Assumptions & Environment Setup

### Required External Setup
- Appium server running externally (localhost:4723)
- Android emulator or real device already started
- App APK installed on device

### Environment Variables
- `ANDROID_AVD`: Emulator name
- `APP_PATH`: Path to APK
- `APPIUM_URL`: Appium server URL (default: http://localhost:4723/wd/hub)

---

## Additional Implementation Goals

### Primary Goals

1. **Minimal Android Support (MVP)**
   - Implement four essential tools: `android_launch_app`, `android_tap`, `android_input_text`, `android_screenshot`
   - Enable agents to run basic Android automation flows
   - No iOS support required initially

2. **Preserve Playwright Parity**
   - All existing Playwright commands must behave identically
   - Standard commands work on both web and mobile
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

### Non-Goals (Out of Scope)

- ❌ iOS support
- ❌ Device lifecycle management (starting/stopping emulators)
- ❌ Cloud device integration
- ❌ CI/CD pipeline integration
- ❌ Headless emulator orchestration
- ❌ Multi-device parallel execution

---

## Code Skeletons

### android_launch_app.js

```javascript
// src/tools/mobile/android/android_launch_app.js
const { getAppiumDriver } = require('../../../appiumClient');

async function android_launch_app(params) {
    const { packageName, appPath } = params;
    
    try {
        const driver = await getAppiumDriver();
        
        if (appPath) {
            // Install and launch app from APK path
            await driver.installApp(appPath);
        }
        
        if (packageName) {
            await driver.activateApp(packageName);
        }
        
        // Wait for app to initialize
        await driver.pause(2000);
        
        return {
            success: true,
            message: `Launched app: ${packageName || appPath}`
        };
    } catch (error) {
        throw new Error(`Failed to launch Android app: ${error.message}`);
    }
}

module.exports = { android_launch_app };
```

### android_tap.js

```javascript
// src/tools/mobile/android/android_tap.js
const { getAppiumDriver } = require('../../../appiumClient');
const { translateSelector, waitForElement } = require('./utils');

async function android_tap(params) {
    const { selector, x, y } = params;
    
    try {
        const driver = await getAppiumDriver();
        
        if (x !== undefined && y !== undefined) {
            // Tap at coordinates
            await driver.touchAction([
                { action: 'tap', x, y }
            ]);
        } else {
            // Find and tap element
            const androidSelector = translateSelector(selector);
            const element = await waitForElement(driver, androidSelector);
            await element.click();
        }
        
        return {
            success: true,
            message: `Tapped ${selector || `(${x}, ${y})`}`
        };
    } catch (error) {
        throw new Error(`Failed to tap: ${error.message}`);
    }
}

module.exports = { android_tap };
```

### android_input_text.js

```javascript
// src/tools/mobile/android/android_input_text.js
const { getAppiumDriver } = require('../../../appiumClient');
const { translateSelector, waitForElement } = require('./utils');

async function android_input_text(params) {
    const { selector, text, clear = false } = params;
    
    try {
        const driver = await getAppiumDriver();
        const androidSelector = translateSelector(selector);
        const element = await waitForElement(driver, androidSelector);
        
        if (clear) {
            await element.clearValue();
        }
        
        await element.setValue(text);
        
        return {
            success: true,
            message: `Input text into ${selector}`
        };
    } catch (error) {
        throw new Error(`Failed to input text: ${error.message}`);
    }
}

module.exports = { android_input_text };
```

### android_screenshot.js

```javascript
// src/tools/mobile/android/android_screenshot.js
const { getAppiumDriver } = require('../../../appiumClient');
const fs = require('fs');

async function android_screenshot(params) {
    const { path, selector } = params;
    
    try {
        const driver = await getAppiumDriver();
        
        let screenshot;
        if (selector) {
            // Element screenshot
            const androidSelector = translateSelector(selector);
            const element = await waitForElement(driver, androidSelector);
            screenshot = await element.takeScreenshot();
        } else {
            // Full screen screenshot
            screenshot = await driver.takeScreenshot();
        }
        
        if (path) {
            fs.writeFileSync(path, screenshot, 'base64');
            return {
                success: true,
                message: `Screenshot saved to ${path}`
            };
        } else {
            return {
                success: true,
                screenshot: screenshot,
                message: 'Screenshot captured'
            };
        }
    } catch (error) {
        throw new Error(`Failed to take screenshot: ${error.message}`);
    }
}

module.exports = { android_screenshot };
```

### utils.js (Helper Functions)

```javascript
// src/tools/mobile/android/utils.js

function translateSelector(playwrightSelector) {
    // Translate Playwright selector to Android/Appium selector
    if (playwrightSelector.startsWith('#')) {
        // ID selector → accessibility ID
        return `~${playwrightSelector.slice(1)}`;
    } else if (playwrightSelector.startsWith('[data-testid="')) {
        // Test ID selector
        const testId = playwrightSelector.match(/data-testid="([^"]+)"/)[1];
        return `~${testId}`;
    } else if (playwrightSelector.startsWith('text=')) {
        // Text selector → XPath
        const text = playwrightSelector.slice(5);
        return `//*[@text='${text}']`;
    } else if (playwrightSelector.startsWith('.')) {
        // Class selector → XPath
        const className = playwrightSelector.slice(1);
        return `//*[contains(@class, '${className}')]`;
    } else {
        // Fallback to accessibility ID
        return `~${playwrightSelector}`;
    }
}

async function waitForElement(driver, selector, timeout = 30000) {
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
        await driver.pause(100);
    }
    
    throw new Error(`Timeout waiting for element: ${selector}`);
}

module.exports = { translateSelector, waitForElement };
```

---

## Future Roadmap

### Phase 2: Enhanced Android Support
- Additional tools: swipe, scroll, long press
- Screenshot comparison capabilities
- Performance monitoring
- Network simulation

### Phase 3: iOS Support
- Similar architecture with iOS-specific tools
- WebDriverAgent integration
- iOS simulator support

### Phase 4: CI/CD Integration
- Headless emulator orchestration
- Parallel test execution
- Cloud device integration
- Automated reporting

---

## Summary

This document provides a complete guide for implementing Android mobile support in Playwright MCP. The key principles are:

1. **Single Handler Architecture** - All commands flow through one handler with target-based routing
2. **Backward Compatibility** - Existing web automation remains completely unchanged
3. **Minimal MVP** - Four essential tools to get started
4. **Transparent Selector Translation** - Agents use Playwright selectors, internal mapping to Android
5. **Automatic Reliability** - Built-in waits and retries, no exposed sleep commands

Follow the implementation checklist, validate at each step, and keep commits small and focused for easy review.
