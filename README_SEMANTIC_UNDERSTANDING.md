# Semantic UI Understanding for Android Automation

## Overview

This document explains the technical approach behind Android MCP's semantic UI understanding—enabling AI agents to reason about screen content rather than execute hardcoded selectors.

## Problem Statement

Traditional mobile automation relies on:
- **Fixed selectors** that break when IDs change
- **Hardcoded navigation paths** that fail on layout updates  
- **Pixel coordinates** that don't scale across devices

This creates brittle automation that requires constant maintenance.

## Solution: View Tree Visibility

The `android_snapshot` tool extracts the complete Android UI hierarchy and transforms it into a semantic model that agents can reason about.

### Data Flow

```
Android Device                    MCP Server                         AI Agent
      │                               │                                  │
      │   UiAutomator2 getPageSource  │                                  │
      │◀──────────────────────────────│                                  │
      │                               │                                  │
      │   XML UI Hierarchy            │                                  │
      │──────────────────────────────▶│                                  │
      │                               │                                  │
      │                               │  Parse & Transform               │
      │                               │  ────────────────                │
      │                               │                                  │
      │                               │  Semantic Model (JSON/Markdown)  │
      │                               │─────────────────────────────────▶│
      │                               │                                  │
      │                               │                       Agent reasons
      │                               │                       about content
      │                               │                                  │
      │                               │  android_tap(selector)           │
      │                               │◀─────────────────────────────────│
      │                               │                                  │
```

### Transformation Example

**Input: Android UI Automator XML**
```xml
<android.widget.LinearLayout>
  <android.widget.TextView 
    text="Network & internet"
    resource-id="android:id/title" />
  <android.widget.TextView 
    text="Mobile, Wi-Fi, hotspot"
    resource-id="android:id/summary" />
</android.widget.LinearLayout>
```

**Output: Semantic Model**
```json
{
  "type": "clickable",
  "label": "Network & internet",
  "subtitle": "Mobile, Wi-Fi, hotspot",
  "selectors": {
    "text": "text=Network & internet",
    "resourceId": "resource-id=android:id/title"
  },
  "state": {
    "clickable": true,
    "enabled": true
  }
}
```

## Key Capabilities

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| **Hierarchical Context** | Parent-child relationships preserved | Subtitles associated with headers |
| **Multiple Selectors** | text, resource-id, content-desc, coordinates | Fallback options if primary fails |
| **Element Classification** | Widget class → semantic type mapping | Agent understands button vs toggle vs input |
| **State Extraction** | enabled, checked, focused, scrollable | Agent knows current UI state |
| **Text Aggregation** | All text within containers collected | Semantic matching on compound elements |

## Agent Reasoning Example

**Task:** "Check data usage"

The agent doesn't know where "data usage" is, but can reason from context:

1. **Snapshot** → Settings menu visible
2. **Analysis** → "Data usage" not directly visible
3. **Reasoning** → "Network & internet" with subtitle "Mobile, Wi-Fi, hotspot" relates to data/network
4. **Action** → Tap "Network & internet"
5. **Snapshot** → New screen with "Data usage" option
6. **Action** → Tap "Data usage"

The agent navigates semantically rather than following a script.

## Implementation Details

### UI Parser (`android_snapshot.js`)

Parses UiAutomator2 XML and extracts:
- Interactive elements (buttons, toggles, inputs)
- Text content and accessibility labels
- Hierarchical relationships
- Element states

### Selector Translation (`utils.js`)

Converts Playwright-style selectors to UiAutomator2:

| Input | Output |
|-------|--------|
| `#login` | `~login` (accessibility ID) |
| `[data-testid="x"]` | `~x` |
| `text=Submit` | `//*[@text='Submit' or @content-desc='Submit']` |
| `.Button` | `//*[contains(@class, 'Button')]` |

### Automatic Waits

Element interactions include polling waits for:
- Element existence in hierarchy
- Element visibility (displayed=true)
- Element enabled state
- Post-tap UI stability

## Comparison

| Approach | Selector | Adaptability | Maintenance |
|----------|----------|--------------|-------------|
| Hardcoded IDs | `com.app:id/btn_123` | None | High |
| XPath | `//Button[@text='Login']` | Low | Medium |
| **Semantic** | Agent reasons from context | High | Low |

## Files

| File | Purpose |
|------|---------|
| `src/tools/android/android_snapshot.js` | UI hierarchy parsing and transformation |
| `src/tools/android/utils.js` | Selector translation, automatic waits |
| `src/appiumClient.js` | WebDriverIO session management |
| `src/androidHealth.js` | Infrastructure health and auto-start |
