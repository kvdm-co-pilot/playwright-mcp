# Mobile Integration Guide

## 🎯 Overview

Playwright MCP provides comprehensive mobile device emulation capabilities, enabling you to test and interact with web applications as they appear on mobile devices. This guide covers mobile integration at the Playwright handler level, including device emulation, touch interactions, and mobile-specific configurations.

## 📱 Core Mobile Capabilities

### Device Emulation

Playwright MCP supports device emulation through multiple approaches:

1. **Pre-configured Device Profiles** - Use Playwright's built-in device registry
2. **Custom Device Configuration** - Define custom viewport, user agent, and device characteristics
3. **Dynamic Device Switching** - Change device profiles during runtime

### Key Mobile Features

- ✅ Touch event emulation
- ✅ Viewport and screen size configuration
- ✅ User agent spoofing
- ✅ Device pixel ratio (DPR) support
- ✅ Geolocation simulation
- ✅ Orientation changes (portrait/landscape)
- ✅ Network throttling
- ✅ Mobile-specific permissions
- ✅ Touch gestures (tap, swipe, pinch-to-zoom)

## 🔧 Configuration

### Using Pre-configured Devices

Playwright MCP includes a registry of popular mobile devices:

```bash
# Emulate iPhone 15
npx @playwright/mcp --device "iPhone 15"

# Emulate iPad Pro
npx @playwright/mcp --device "iPad Pro 11"

# Emulate Android devices
npx @playwright/mcp --device "Pixel 7"
npx @playwright/mcp --device "Galaxy S23"
```

### Popular Device Profiles

| Device | Viewport | DPR | User Agent Type |
|--------|----------|-----|-----------------|
| iPhone 15 | 393x852 | 3 | Mobile Safari |
| iPhone 15 Pro Max | 430x932 | 3 | Mobile Safari |
| iPad Pro 11 | 834x1194 | 2 | Mobile Safari |
| Pixel 7 | 412x915 | 2.625 | Chrome Android |
| Galaxy S23 | 360x780 | 3 | Chrome Android |

### Configuration File Approach

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--device=iPhone 15",
        "--grant-permissions=geolocation"
      ]
    }
  }
}
```

### Programmatic Configuration

```javascript
const { createConnection } = require('@playwright/mcp');

const connection = await createConnection({
  browser: {
    contextOptions: {
      // Use Playwright's device registry
      ...devices['iPhone 15'],
      
      // Or define custom device
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      
      // Mobile-specific permissions
      permissions: ['geolocation'],
      geolocation: { latitude: 37.7749, longitude: -122.4194 },
      
      // Locale and timezone
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles'
    }
  }
});
```

## 🎨 Custom Device Configuration

### Viewport Configuration

```json
{
  "browser": {
    "contextOptions": {
      "viewport": {
        "width": 414,
        "height": 896
      },
      "deviceScaleFactor": 3
    }
  }
}
```

Via CLI:

```bash
npx @playwright/mcp --viewport-size=414x896
```

### User Agent Configuration

```json
{
  "browser": {
    "contextOptions": {
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    }
  }
}
```

Via CLI:

```bash
npx @playwright/mcp --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
```

### Complete Mobile Configuration Example

```json
{
  "browser": {
    "contextOptions": {
      "viewport": { "width": 393, "height": 852 },
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "permissions": ["geolocation", "notifications"],
      "geolocation": { 
        "latitude": 37.7749, 
        "longitude": -122.4194,
        "accuracy": 100
      },
      "locale": "en-US",
      "timezoneId": "America/Los_Angeles"
    }
  }
}
```

## 📐 Handler-Level Mobile Integration

### Touch Event Handling

At the Playwright handler level, mobile interactions are automatically translated to touch events when `hasTouch: true` is configured.

#### Click → Tap

```typescript
// MCP Tool: browser_click
// Handler automatically uses touch events for mobile devices
await page.getByRole('button', { name: 'Submit' }).click();
// → Generates touchstart, touchend events on mobile
```

#### Type → Mobile Keyboard

```typescript
// MCP Tool: browser_type
// Handler shows mobile keyboard on focus
await page.getByRole('textbox').fill('text');
// → Triggers mobile keyboard on mobile devices
```

### Touch Gestures (Vision Capability)

With `--caps=vision`, coordinate-based touch gestures are available:

```bash
npx @playwright/mcp --device "iPhone 15" --caps=vision
```

#### Available Gesture Tools

1. **browser_mouse_click_xy** - Tap at coordinates
2. **browser_mouse_drag_xy** - Swipe gesture
3. **browser_mouse_move_xy** - Touch and hold

#### Swipe Example

```javascript
// Swipe right (drag from left to right)
await client.callTool({
  name: 'browser_mouse_drag_xy',
  arguments: {
    element: 'carousel',
    startX: 100,
    startY: 400,
    endX: 300,
    endY: 400
  }
});
```

## 🌍 Geolocation

### Setting Geolocation

```bash
npx @playwright/mcp --device "iPhone 15" --grant-permissions geolocation
```

Then use initialization script:

```javascript
// init-page.ts
export default async ({ page }) => {
  await page.context().setGeolocation({
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 100
  });
};
```

```bash
npx @playwright/mcp --device "iPhone 15" --init-page ./init-page.ts
```

### Dynamic Geolocation Changes

```javascript
// MCP Tool: browser_run_code
await client.callTool({
  name: 'browser_run_code',
  arguments: {
    code: `async (page) => {
      await page.context().setGeolocation({
        latitude: 40.7128,
        longitude: -74.0060
      });
      await page.reload();
    }`
  }
});
```

## 🔄 Orientation Changes

### Portrait to Landscape

```javascript
// init-page.ts
export default async ({ page }) => {
  // Portrait (default)
  await page.setViewportSize({ width: 393, height: 852 });
  
  // Landscape
  await page.setViewportSize({ width: 852, height: 393 });
};
```

### Dynamic Orientation

```javascript
// Using browser_run_code tool
await client.callTool({
  name: 'browser_run_code',
  arguments: {
    code: `async (page) => {
      const current = page.viewportSize();
      await page.setViewportSize({
        width: current.height,
        height: current.width
      });
    }`
  }
});
```

## 🔒 Mobile Permissions

### Common Mobile Permissions

- `geolocation` - GPS location
- `notifications` - Push notifications
- `camera` - Camera access
- `microphone` - Microphone access
- `clipboard-read` - Read clipboard
- `clipboard-write` - Write clipboard

### Granting Permissions

```bash
npx @playwright/mcp \
  --device "iPhone 15" \
  --grant-permissions geolocation,notifications,camera
```

Via config:

```json
{
  "browser": {
    "contextOptions": {
      "permissions": ["geolocation", "notifications", "camera"]
    }
  }
}
```

## 🌐 Network Conditions

### Mobile Network Emulation

```javascript
// init-page.ts
export default async ({ page }) => {
  // Emulate 3G network
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), 300); // 300ms delay
  });
};
```

### Offline Mode

```javascript
export default async ({ page }) => {
  await page.context().setOffline(true);
};
```

## 🎭 Mobile-Specific Workflows

### Workflow 1: Test Responsive Design

```bash
# Test desktop
npx @playwright/mcp --viewport-size=1920x1080

# Test tablet
npx @playwright/mcp --device "iPad Pro 11"

# Test mobile
npx @playwright/mcp --device "iPhone 15"
```

### Workflow 2: Test Geolocation Features

```bash
# Start with geolocation in San Francisco
npx @playwright/mcp \
  --device "iPhone 15" \
  --grant-permissions geolocation \
  --init-page ./sf-location.ts
```

```javascript
// sf-location.ts
export default async ({ page }) => {
  await page.context().setGeolocation({
    latitude: 37.7749,
    longitude: -122.4194
  });
};
```

### Workflow 3: Test Touch Interactions

```bash
# Enable vision capability for touch coordinates
npx @playwright/mcp \
  --device "iPhone 15" \
  --caps=vision
```

Then use coordinate-based tools for swipes, pinches, etc.

### Workflow 4: Test PWA Installation

```bash
# Test Progressive Web App
npx @playwright/mcp \
  --device "iPhone 15" \
  --grant-permissions notifications
```

## 🧪 Mobile Testing Best Practices

### 1. Test Real Device Scenarios

```javascript
// Good: Use realistic device profiles
const config = {
  browser: {
    contextOptions: devices['iPhone 15']
  }
};

// Bad: Use arbitrary viewport sizes
const config = {
  browser: {
    contextOptions: {
      viewport: { width: 400, height: 700 }
    }
  }
};
```

### 2. Account for Touch Targets

Mobile elements need larger touch targets (44x44px minimum):

```javascript
// Ensure element is tappable
await page.getByRole('button').click(); // ✅ Works with touch
```

### 3. Test Different Orientations

```javascript
// Test both portrait and landscape
const orientations = [
  { width: 393, height: 852 }, // Portrait
  { width: 852, height: 393 }  // Landscape
];

for (const viewport of orientations) {
  await page.setViewportSize(viewport);
  // Test functionality
}
```

### 4. Test Network Conditions

```javascript
// Simulate slow network
await page.route('**/*', route => {
  setTimeout(() => route.continue(), 500);
});
```

### 5. Handle Mobile Keyboards

Mobile keyboards affect viewport height:

```javascript
// Element may be obscured by keyboard
await page.getByRole('textbox').scrollIntoViewIfNeeded();
await page.getByRole('textbox').fill('text');
```

## 📊 Mobile Testing Checklist

### Device Coverage

- [ ] iPhone (latest iOS)
- [ ] iPhone (iOS - 1 version)
- [ ] iPad
- [ ] Android phone (latest)
- [ ] Android tablet

### Feature Coverage

- [ ] Touch interactions (tap, swipe)
- [ ] Orientation changes
- [ ] Geolocation features
- [ ] Mobile navigation patterns
- [ ] Touch-specific UI elements
- [ ] Mobile keyboard interactions
- [ ] Network conditions (3G, 4G, offline)
- [ ] Mobile-specific permissions

### Performance

- [ ] Page load time on mobile network
- [ ] Touch response time
- [ ] Scroll performance
- [ ] Animation smoothness

## 🔍 Debugging Mobile Issues

### Enable Mobile Debug Mode

```bash
DEBUG=pw:mcp:* npx @playwright/mcp --device "iPhone 15"
```

### Save Mobile Session

```bash
npx @playwright/mcp \
  --device "iPhone 15" \
  --save-trace \
  --save-video=393x852 \
  --output-dir=./mobile-traces
```

### View Mobile Trace

```bash
npx playwright show-trace ./mobile-traces/trace.zip
```

### Screenshot Mobile Viewport

```javascript
await client.callTool({
  name: 'browser_take_screenshot',
  arguments: {
    filename: 'mobile-screenshot.png',
    type: 'png'
  }
});
```

## 🎨 Advanced Mobile Patterns

### Pattern 1: Progressive Enhancement

Test both mobile and desktop experiences:

```javascript
const devices = ['iPhone 15', 'Desktop Chrome'];

for (const deviceName of devices) {
  const connection = await createConnection({
    browser: {
      contextOptions: deviceName === 'Desktop Chrome' 
        ? { viewport: { width: 1920, height: 1080 } }
        : devices[deviceName]
    }
  });
  // Test functionality
}
```

### Pattern 2: Geofencing

Test location-based features:

```javascript
const locations = [
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 }
];

for (const location of locations) {
  await page.context().setGeolocation({
    latitude: location.lat,
    longitude: location.lng
  });
  // Test location-specific content
}
```

### Pattern 3: Multi-Touch Gestures

With vision capability:

```javascript
// Pinch to zoom (two-finger gesture simulation)
await client.callTool({
  name: 'browser_run_code',
  arguments: {
    code: `async (page) => {
      await page.touchscreen.tap(200, 400);
      await page.touchscreen.tap(300, 400);
    }`
  }
});
```

## 📚 Mobile Device Reference

### iOS Devices

```
iPhone 15 Pro Max    - 430x932  @ 3x
iPhone 15 Pro        - 393x852  @ 3x
iPhone 15            - 393x852  @ 3x
iPhone 14 Pro Max    - 430x932  @ 3x
iPhone 14 Pro        - 393x852  @ 3x
iPhone 14            - 390x844  @ 3x
iPhone SE            - 375x667  @ 2x
iPad Pro 12.9        - 1024x1366 @ 2x
iPad Pro 11          - 834x1194 @ 2x
iPad Air             - 820x1180 @ 2x
iPad Mini            - 744x1133 @ 2x
```

### Android Devices

```
Pixel 7              - 412x915  @ 2.625x
Pixel 7 Pro          - 412x892  @ 3.5x
Pixel 6              - 412x915  @ 2.625x
Galaxy S23           - 360x780  @ 3x
Galaxy S23+          - 384x854  @ 3x
Galaxy S23 Ultra     - 384x854  @ 3x
Galaxy Tab S8        - 800x1280 @ 2x
```

## 🔗 Integration with MCP Tools

### Mobile-Aware Tool Usage

All standard MCP tools work with mobile devices:

```javascript
// Navigation
await client.callTool({
  name: 'browser_navigate',
  arguments: { url: 'https://m.example.com' }
});

// Mobile-optimized clicking (tap)
await client.callTool({
  name: 'browser_click',
  arguments: {
    element: 'menu button',
    ref: 'e1'
  }
});

// Mobile keyboard input
await client.callTool({
  name: 'browser_type',
  arguments: {
    element: 'search box',
    ref: 'e2',
    text: 'query'
  }
});

// Snapshot shows mobile viewport
await client.callTool({
  name: 'browser_snapshot'
});
```

## 🎯 Use Cases

### E-commerce Mobile Testing

```bash
npx @playwright/mcp \
  --device "iPhone 15" \
  --grant-permissions geolocation \
  --init-page ./mobile-shopper.ts
```

```javascript
// mobile-shopper.ts
export default async ({ page }) => {
  await page.context().setGeolocation({
    latitude: 37.7749,
    longitude: -122.4194
  });
  
  // Emulate logged-in mobile user
  await page.context().addCookies([
    {
      name: 'session',
      value: 'mobile-user-token',
      domain: '.example.com',
      path: '/'
    }
  ]);
};
```

### Mobile App Testing (PWA)

```bash
npx @playwright/mcp \
  --device "Pixel 7" \
  --grant-permissions notifications,geolocation
```

### Mobile Web Performance

```bash
npx @playwright/mcp \
  --device "iPhone 15" \
  --save-trace \
  --output-dir=./performance-traces
```

## 🚨 Common Mobile Issues

### Issue 1: Touch Events Not Working

**Problem**: Clicks not registering on mobile

**Solution**: Ensure `hasTouch: true` in context options

```json
{
  "browser": {
    "contextOptions": {
      "hasTouch": true,
      "isMobile": true
    }
  }
}
```

### Issue 2: Viewport Not Matching Device

**Problem**: Content doesn't fit viewport

**Solution**: Set correct viewport and device scale factor

```json
{
  "browser": {
    "contextOptions": {
      "viewport": { "width": 393, "height": 852 },
      "deviceScaleFactor": 3
    }
  }
}
```

### Issue 3: Geolocation Permission Denied

**Problem**: Geolocation requests fail

**Solution**: Grant permission before setting location

```bash
npx @playwright/mcp \
  --device "iPhone 15" \
  --grant-permissions geolocation
```

### Issue 4: Mobile Keyboard Obscuring Elements

**Problem**: Elements hidden by virtual keyboard

**Solution**: Scroll element into view before interaction

```javascript
await client.callTool({
  name: 'browser_run_code',
  arguments: {
    code: `async (page) => {
      const input = page.getByRole('textbox');
      await input.scrollIntoViewIfNeeded();
      await input.focus();
    }`
  }
});
```

## 📈 Performance Optimization

### Reduce Mobile Overhead

```javascript
{
  "browser": {
    "contextOptions": {
      // Disable unnecessary features
      "reducedMotion": "reduce",
      "forcedColors": "none"
    }
  },
  // Skip images for faster loading
  "imageResponses": "omit"
}
```

### Parallel Mobile Testing

```javascript
// Test multiple devices simultaneously
const devices = ['iPhone 15', 'Pixel 7', 'iPad Pro 11'];
const connections = await Promise.all(
  devices.map(device => createConnection({
    browser: { contextOptions: devices[device] }
  }))
);
```

## 🎓 Learning Resources

### Playwright Mobile Testing

- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Device Descriptors](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json)
- [Mobile Testing Best Practices](https://playwright.dev/docs/best-practices#mobile-testing)

### Mobile Web Standards

- [Touch Events Specification](https://www.w3.org/TR/touch-events/)
- [Mobile Web Best Practices](https://www.w3.org/TR/mobile-bp/)
- [Responsive Design Guidelines](https://web.dev/responsive-web-design-basics/)

## 🎉 Summary

Playwright MCP provides comprehensive mobile integration at the handler level:

- ✅ **Device Emulation**: 100+ pre-configured devices
- ✅ **Touch Events**: Automatic touch handling on mobile
- ✅ **Geolocation**: Full GPS simulation support
- ✅ **Permissions**: Mobile-specific permission grants
- ✅ **Gestures**: Coordinate-based touch interactions
- ✅ **Network**: Mobile network condition emulation
- ✅ **Debugging**: Full trace and video recording

All standard MCP tools work seamlessly with mobile device emulation, with the Playwright handler automatically adapting interactions for touch-based devices.

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Related**: [ARCHITECTURE.md](ARCHITECTURE.md), [EXECUTION_PLAN.md](EXECUTION_PLAN.md), [BEST_PRACTICES.md](BEST_PRACTICES.md)
