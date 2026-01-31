# Agent Prompt: Implement Android Mobile Support for Playwright MCP

## Context

You are working on the `playwright-mcp` repository to add minimal Android mobile automation support. Read the complete design document at `ANDROID_MOBILE_SUPPORT.md` which contains all architectural decisions, goals, and implementation details.

## Core Architecture Decision (CRITICAL)

**ALL commands must flow through the Playwright handler.** The handler will route based on a `target` parameter:
- `target: 'web'` (default) → existing Playwright web automation
- `target: 'android'` → new Appium-based Android automation

This single-handler architecture ensures:
- Unified command interface for agents
- Backward compatibility (web is default)
- Clean separation between web and mobile
- Consistent error handling and behavior

**There is ONE handler. All tools go through it. The handler routes based on target.**

## Your Mission

Implement the MVP Android mobile support with these four tools:
1. `android_launch_app` - Launch Android app
2. `android_tap` - Tap element or coordinates
3. `android_input_text` - Input text into element
4. `android_screenshot` - Capture screenshot

## Investigation Phase

### 1. Understand Current Playwright Handler Architecture
- **Primary focus**: Find where the Playwright handler is defined (likely `index.js` or separate handler file)
- How are tools currently registered and dispatched in the handler?
- What's the handler's signature and how does it process tool calls?
- How does it currently route to different Playwright tools?
- What's the error handling pattern?

### 2. Identify Handler Integration Points
- **Where exactly is the main Playwright handler function?**
- How do tool calls reach the handler (MCP server → handler flow)?
- What's the tool call structure (parameters, target, etc.)?
- How are tools currently discovered and registered?
- Can we add a routing layer **inside** the handler without breaking existing code?

### 3. Design Handler Modification Strategy
- Add `target` parameter detection at the **top of the handler**
- Route to Android tools when `target === 'android'`
- Default to existing web Playwright logic for all other cases
- Keep Android tools completely separate from web tools
- Ensure zero impact on existing web tool execution paths

## Implementation Requirements

### Phase 1: Setup & Dependencies
1. Add required dependencies to `package.json`:
   - `webdriverio` (for Appium client)
   - `appium` (peer dependency, optional - not bundled)
2. Create directory structure: `src/tools/mobile/android/`
3. Create `src/appiumClient.js` with connection logic

### Phase 2: Modify Playwright Handler for Routing
**This is the critical phase.**

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

**Tool 1: android_launch_app.js**
- Parameters: `packageName` or `appPath`
- Wait for app to initialize
- Return success/failure

**Tool 2: android_tap.js**
- Parameters: `selector` (Playwright-style) OR `x, y` coordinates
- Translate selector to Android format internally
- Wait for element visibility and enabled state
- Perform tap action

**Tool 3: android_input_text.js**
- Parameters: `selector`, `text`, optional `clear`
- Find element, wait for it
- Clear if requested, then input text
- Handle keyboard visibility

**Tool 4: android_screenshot.js**
- Parameters: optional `path`, optional `selector` (for element screenshot)
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

## Critical Constraints

- ❌ **DO NOT** break existing web Playwright functionality
- ❌ **DO NOT** create a separate handler - use the existing Playwright handler
- ❌ **DO NOT** modify existing tool signatures or behavior
- ❌ **DO NOT** add device lifecycle management
- ❌ **DO NOT** expose sleep/wait commands to agents
- ❌ **DO NOT** create new selector syntax for agents
- ✅ **DO** add routing logic to the Playwright handler
- ✅ **DO** make Android tools completely separate from web tools
- ✅ **DO** implement automatic waits internally
- ✅ **DO** translate selectors transparently
- ✅ **DO** keep commits small and focused
- ✅ **DO** default to web when no target specified

## Key Architecture Points

1. **Single Handler**: All commands (web + Android) flow through the Playwright handler
2. **Target-Based Routing**: Handler checks `target` parameter and routes accordingly
3. **Separation**: Android tools live in `src/tools/mobile/android/`, never mixed with web
4. **Backward Compatibility**: Default behavior unchanged - web tools work exactly as before
5. **Opt-In**: Android only used when explicitly specified via `target: 'android'`

## Validation Steps

After implementation:
1. Verify existing web tools still work unchanged
2. Test handler routing logic for both web and Android targets
3. Verify each Android tool independently
4. Confirm selector translation works correctly
5. Check automatic waits prevent flakiness
6. Validate error messages match Playwright patterns
7. Test edge cases (missing target, invalid target, etc.)

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

## Deliverables

1. Modified Playwright handler with routing logic
2. Working code for all four MVP Android tools
3. Updated README.md with Android section
4. Clean commit history with focused changes
5. (Optional) Basic tests validating functionality

## Start Here

1. Read `ANDROID_MOBILE_SUPPORT.md` thoroughly
2. **Find the Playwright handler** - this is your primary integration point
3. Understand how the handler currently processes tool calls
4. Design minimal routing modification to the handler
5. Implement Android tools as separate, isolated modules
6. Test incrementally at each step
7. Keep the PR small and reviewable

## Architecture Flow Diagram

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

Remember: **The handler is the key integration point.** All commands flow through it. Your job is to add a clean routing layer that directs Android commands to new tools while preserving all existing web behavior.

## Example Usage After Implementation

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
