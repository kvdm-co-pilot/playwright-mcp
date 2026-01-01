# Playwright MCP - Architecture Documentation

## 🎯 Overview

Playwright MCP is a **Model Context Protocol (MCP) server** that bridges Large Language Models (LLMs) with browser automation capabilities. It provides a structured, deterministic interface for web interaction without relying on visual/screenshot-based approaches.

## 🏛️ High-Level Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External World                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ VS Code  │  │  Cursor  │  │  Claude  │  │  Goose   │  ...     │
│  │          │  │          │  │ Desktop  │  │          │          │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘          │
│        │             │              │             │                │
└────────┼─────────────┼──────────────┼─────────────┼────────────────┘
         │             │              │             │
         └─────────────┴──────────────┴─────────────┘
                       │
              MCP Protocol (JSON-RPC)
        (STDIO Transport / HTTP-SSE Transport)
                       │
         ┌─────────────▼──────────────┐
         │                            │
         │  Playwright MCP Server     │
         │  (This Repository)         │
         │                            │
         └─────────────┬──────────────┘
                       │
                       │ Playwright API
                       │
         ┌─────────────▼──────────────┐
         │                            │
         │  Playwright Core Library   │
         │  (microsoft/playwright)    │
         │                            │
         └─────────────┬──────────────┘
                       │
                       │ DevTools Protocol / WebDriver
                       │
    ┌──────────────────┴──────────────────┐
    │                                     │
┌───▼────┐  ┌──────────┐  ┌──────────┐   │
│Chromium│  │ Firefox  │  │ WebKit   │   │
│        │  │          │  │          │   │
└────────┘  └──────────┘  └──────────┘   │
```

## 📦 Component Architecture

### Layer 1: Entry Points

```typescript
// cli.js - Command-line interface entry point
const { program } = require('playwright-core/lib/utilsBundle');
const { decorateCommand } = require('playwright/lib/mcp/program');

// Responsibilities:
// - Parse CLI arguments
// - Initialize configuration
// - Start MCP server with STDIO transport

// index.js - Programmatic API entry point
const { createConnection } = require('playwright/lib/mcp/index');

// Responsibilities:
// - Export programmatic API
// - Allow custom transports (HTTP/SSE)
// - Enable embedding in other applications
```

### Layer 2: MCP Server Core (in Playwright Monorepo)

Located at `packages/playwright/src/mcp/` in `microsoft/playwright`:

```
packages/playwright/src/mcp/
├── index.ts              # createConnection() API
├── program.ts            # CLI command decoration
├── server.ts             # MCP server implementation
├── config.ts             # Configuration types and validation
├── capabilities/         # Capability system
│   ├── core.ts          # Core browser automation tools
│   ├── tabs.ts          # Tab management
│   ├── install.ts       # Browser installation
│   ├── vision.ts        # Coordinate-based interactions
│   ├── pdf.ts           # PDF generation
│   ├── testing.ts       # Test assertions
│   └── tracing.ts       # Trace recording
├── tools/               # Individual tool implementations
│   ├── navigate.ts
│   ├── click.ts
│   ├── type.ts
│   ├── snapshot.ts
│   └── ...
└── utils/               # Shared utilities
    ├── snapshot.ts      # Accessibility tree snapshot
    ├── locator.ts       # Element locator generation
    └── storage.ts       # State management
```

### Layer 3: Transport Layer

```
┌────────────────────────────────────────────────────┐
│              Transport Abstraction                 │
├────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │  STDIO Transport │  │  HTTP/SSE        │       │
│  │                  │  │  Transport       │       │
│  │  - Default mode  │  │  - Standalone    │       │
│  │  - Process I/O   │  │  - Remote access │       │
│  │  - Most clients  │  │  - --port flag   │       │
│  └──────────────────┘  └──────────────────┘       │
└────────────────────────────────────────────────────┘
```

### Layer 4: Browser Context Management

```
┌────────────────────────────────────────────────────┐
│          Browser Context Manager                   │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  Context Strategy Selection                 │  │
│  │                                             │  │
│  │  if (--extension)                           │  │
│  │    → ExtensionContext                       │  │
│  │  else if (--cdp-endpoint)                   │  │
│  │    → CDPContext                             │  │
│  │  else if (--isolated)                       │  │
│  │    → IsolatedContext                        │  │
│  │  else                                       │  │
│  │    → PersistentContext (default)            │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Persistent   │  │  Isolated    │              │
│  │ Context      │  │  Context     │              │
│  │              │  │              │              │
│  │ - User data  │  │ - Temporary  │              │
│  │   saved      │  │ - Clean each │              │
│  │ - Cookies    │  │   session    │              │
│  │   persist    │  │ - Storage    │              │
│  │              │  │   state file │              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ CDP Context  │  │ Extension    │              │
│  │              │  │ Context      │              │
│  │ - Connect to │  │ - Bridge ext │              │
│  │   existing   │  │ - Use live   │              │
│  │ - Chrome     │  │   browser    │              │
│  │   DevTools   │  │              │              │
│  └──────────────┘  └──────────────┘              │
└────────────────────────────────────────────────────┘
```

## 🔧 Capabilities System

### Capability Architecture

The capability system provides modular, opt-in features:

```typescript
// Capability Definition
interface Capability {
  name: string;
  tools: Tool[];
  enabled: boolean;
}

// Tool Definition
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: any, context: BrowserContext) => Promise<ToolResponse>;
}
```

### Capability Loading Flow

```
CLI Args: --caps=vision,pdf
         │
         ▼
┌────────────────────────┐
│  Parse Capabilities    │
│                        │
│  ['vision', 'pdf']     │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Load Core Always      │
│                        │
│  + core                │
│  + core-tabs           │
│  + core-install        │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Load Optional Caps    │
│                        │
│  + vision              │
│  + pdf                 │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Register Tools        │
│                        │
│  server.setTool(...)   │
└────────────────────────┘
```

### Capability Matrix

| Capability   | Default | Description                    | Tool Count |
|-------------|---------|--------------------------------|------------|
| core        | ✓       | Basic browser automation       | ~20        |
| core-tabs   | ✓       | Tab management                 | 1          |
| core-install| ✓       | Browser installation           | 1          |
| vision      | ✗       | Coordinate-based interactions  | 3          |
| pdf         | ✗       | PDF generation                 | 1          |
| testing     | ✗       | Test assertions                | 4          |
| tracing     | ✗       | Trace recording                | 2          |

## 🔄 Request Processing Flow

### Tool Invocation Lifecycle

```
1. Client sends tool call request
         │
         ▼
2. MCP Server receives request
         │
         ├──> Validate tool exists
         ├──> Validate input schema
         └──> Check permissions
         │
         ▼
3. Route to tool handler
         │
         ▼
4. Tool handler executes
         │
         ├──> Navigate to page
         ├──> Find element (if needed)
         ├──> Perform action
         ├──> Wait for completion
         └──> Capture state
         │
         ▼
5. Generate response
         │
         ├──> Playwright code snippet
         ├──> Page snapshot (accessibility tree)
         ├──> Console messages (if any)
         ├──> Network events (if relevant)
         └──> Error information (if failed)
         │
         ▼
6. Return to client
```

### Example: browser_click Flow

```typescript
// 1. Client request
{
  "method": "tools/call",
  "params": {
    "name": "browser_click",
    "arguments": {
      "element": "Submit button",
      "ref": "e2"
    }
  }
}

// 2. Server processing
async function handleClick(params: { element: string, ref: string }) {
  // Validate reference exists in current snapshot
  const element = await locator.fromRef(params.ref);
  
  // Perform click
  await element.click();
  
  // Generate code for response
  const code = `await page.getByRole('button', { name: 'Submit' }).click();`;
  
  // Capture new state
  const snapshot = await captureAccessibilitySnapshot();
  
  return {
    content: [{
      type: 'text',
      text: formatResponse({ code, snapshot })
    }]
  };
}

// 3. Client response
{
  "content": [{
    "type": "text",
    "text": "### Ran Playwright code\n```js\nawait page.getByRole('button', { name: 'Submit' }).click();\n```\n\n### Page state\n..."
  }]
}
```

## 🎨 Accessibility Snapshot System

### Why Accessibility Tree?

1. **Structured**: Hierarchical, machine-readable format
2. **Semantic**: Includes roles, names, and relationships
3. **Fast**: No image processing required
4. **Deterministic**: Same page = same snapshot (mostly)
5. **Lightweight**: Text-based, not pixel-based

### Snapshot Format

```yaml
- Page URL: https://example.com
- Page Title: Example Domain
- Page Snapshot:
```yaml
- heading "Example Domain" [ref=e1]
- paragraph [ref=e2]: This domain is for use in illustrative examples...
- paragraph [ref=e3]
  - link "More information..." [ref=e4]
```
```

### Snapshot Generation Process

```
1. Get page from Playwright
         │
         ▼
2. Call page.accessibility.snapshot()
         │
         ├──> Traverse DOM
         ├──> Extract accessible nodes
         ├──> Compute roles and names
         └──> Build tree structure
         │
         ▼
3. Post-process snapshot
         │
         ├──> Add unique references (e1, e2, ...)
         ├──> Format as YAML
         ├──> Remove redundant information
         └──> Highlight interactive elements
         │
         ▼
4. Return formatted snapshot
```

## 🔐 Security Architecture

### Security Layers

```
┌────────────────────────────────────────────────────┐
│  Layer 1: Network Security                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Origin Filtering                            │ │
│  │  - Allowed origins list                      │ │
│  │  - Blocked origins list                      │ │
│  │  - Blocklist evaluated first                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  DNS Rebinding Protection                    │ │
│  │  - Allowed hosts validation                  │ │
│  │  - Host header checking                      │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Layer 2: Data Security                            │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Secrets Management                          │ │
│  │  - Dotenv format secrets file                │ │
│  │  - Never expose in snapshots                 │ │
│  │  - Prefer storage state over secrets        │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Storage State Isolation                     │ │
│  │  - Separate contexts per client              │ │
│  │  - Optional shared context                   │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Layer 3: Process Security                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Sandbox                                     │ │
│  │  - Enabled by default                        │ │
│  │  - Disable only in trusted environments     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  File System Access                          │ │
│  │  - Output directory isolation                │ │
│  │  - Upload file validation                    │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Threat Model

**In Scope:**
- Malicious web pages
- SSRF attacks
- Data exfiltration
- DNS rebinding
- Credential exposure

**Out of Scope:**
- Physical access
- OS-level exploits
- Playwright vulnerabilities (upstream responsibility)

## 📊 State Management

### Session State

```typescript
interface SessionState {
  browser: Browser;
  context: BrowserContext;
  pages: Page[];
  currentPage: Page;
  storageState?: string;
  traces?: Trace[];
  videos?: Video[];
}
```

### State Persistence Options

1. **Ephemeral (Isolated)**
   - In-memory profile
   - Lost on close
   - Good for testing

2. **Persistent (User Data Dir)**
   - Disk-based profile
   - Cookies persist
   - Good for development

3. **Snapshot (Storage State)**
   - JSON file with cookies/localStorage
   - Portable between sessions
   - Good for CI/CD

4. **Live (Extension/CDP)**
   - Use existing browser
   - Real user profile
   - Good for debugging

## 🔍 Debugging & Observability

### Instrumentation Points

```
┌────────────────────────────────────────────────────┐
│  Debug Logging (DEBUG=pw:mcp:*)                    │
│  - Tool invocations                                │
│  - Page navigations                                │
│  - Element lookups                                 │
│  - Errors and warnings                             │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Trace Recording (--save-trace)                    │
│  - Complete Playwright trace                       │
│  - Network logs                                    │
│  - Screenshots on actions                          │
│  - Source maps                                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Console Messages (--console-level)                │
│  - Browser console.log()                           │
│  - Errors, warnings, info, debug                   │
│  - Returned in tool responses                      │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Network Monitoring                                │
│  - All requests/responses                          │
│  - Status codes                                    │
│  - Timing information                              │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Session Artifacts (--save-session)                │
│  - Storage state                                   │
│  - Videos (if --save-video)                        │
│  - Traces (if --save-trace)                        │
└────────────────────────────────────────────────────┘
```

## 🧪 Testing Architecture

### Test Layers

```
┌────────────────────────────────────────────────────┐
│  Integration Tests (This Repo)                     │
│  - Black-box MCP protocol testing                  │
│  - Full server lifecycle                           │
│  - Real browser automation                         │
│  - Cross-browser validation                        │
└────────────────────────────────────────────────────┘
         ▲
         │ Uses
         │
┌────────────────────────────────────────────────────┐
│  Test Fixtures (tests/fixtures.ts)                 │
│  - MCP client setup                                │
│  - Test server (HTTP)                              │
│  - Browser server (WebSocket)                      │
│  - Custom matchers                                 │
└────────────────────────────────────────────────────┘
         ▲
         │ Provides
         │
┌────────────────────────────────────────────────────┐
│  Test Utilities                                    │
│  - Response parsing                                │
│  - Snapshot comparison                             │
│  - Output formatting                               │
└────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### Page Snapshot Flow

```
User asks: "What's on the page?"
         │
         ▼
[LLM] ──"browser_snapshot"──> [MCP Server]
                                    │
                                    ▼
                        [Get current page]
                                    │
                                    ▼
                        [page.accessibility.snapshot()]
                                    │
                                    ▼
                        [Format as YAML with refs]
                                    │
                                    ▼
                        [Return structured snapshot]
                                    │
                                    ▼
[LLM] <──snapshot text─── [MCP Server]
         │
         ▼
User sees: Parsed page content
```

### Click Interaction Flow

```
User asks: "Click the submit button"
         │
         ▼
[LLM] analyzes snapshot, finds: button "Submit" [ref=e2]
         │
         ▼
[LLM] ──"browser_click(element='Submit button', ref='e2')"──> [MCP Server]
                                                                      │
                                                                      ▼
                                                          [Validate ref exists]
                                                                      │
                                                                      ▼
                                                          [Get locator from ref]
                                                                      │
                                                                      ▼
                                                          [element.click()]
                                                                      │
                                                                      ▼
                                                          [Wait for action complete]
                                                                      │
                                                                      ▼
                                                          [Capture new snapshot]
                                                                      │
                                                                      ▼
                                                          [Generate Playwright code]
                                                                      │
                                                                      ▼
[LLM] <──{code, new_snapshot, result}─────────────────────── [MCP Server]
         │
         ▼
User sees: "Clicked the submit button"
```

## 🌐 Deployment Patterns

### Pattern 1: Direct STDIO (Most Common)

```
[MCP Client] ──fork──> [npx @playwright/mcp]
                              │
                              ├──> spawns browser
                              └──> communicates via stdin/stdout
```

**Pros:**
- Simple setup
- Automatic lifecycle management
- Client controls browser

**Cons:**
- One browser per client
- Resource intensive

### Pattern 2: HTTP Server (Standalone)

```
[Server Process]
     │
     ├──> npx @playwright/mcp --port 8931
     │    └──> [Browser]
     │
[MCP Client 1] ──HTTP──┐
                       ├──> http://localhost:8931/mcp
[MCP Client 2] ──HTTP──┘
```

**Pros:**
- Shared browser instance
- Remote access
- Better resource usage

**Cons:**
- Manual server management
- Security considerations

### Pattern 3: Docker Container

```
[Docker Host]
     │
     ├──> docker run playwright-mcp
     │    └──> [Headless Browser]
     │
[MCP Client] ──STDIO──> [Docker Container]
```

**Pros:**
- Isolated environment
- Consistent runtime
- Easy deployment

**Cons:**
- Headless only (currently)
- Docker overhead

### Pattern 4: Browser Extension

```
[User's Browser] <──Native Messaging──> [MCP Server]
     │                                        │
     │                                        │
     └──> tabs/windows                        │
                                              │
[MCP Client] ──STDIO──────────────────────────┘
```

**Pros:**
- Use real browser profile
- Existing sessions
- No separate browser

**Cons:**
- Chrome/Edge only
- Extension installation required

## 📈 Performance Considerations

### Optimization Strategies

1. **Snapshot Mode**
   - `incremental`: Only changes since last snapshot (default)
   - `full`: Complete snapshot every time
   - `none`: No snapshots (fastest, least info)

2. **Image Handling**
   - `allow`: Return images in responses (default)
   - `omit`: Skip images (faster, less bandwidth)

3. **Network Filtering**
   - Block analytics/tracking
   - Skip static resources when not needed
   - Use service worker blocking

4. **Context Reuse**
   - `--shared-browser-context`: Share across HTTP clients
   - Persistent profile: Skip login/setup each time

### Performance Metrics

| Operation        | Typical Time | Notes                    |
|-----------------|--------------|--------------------------|
| Server start    | 1-3s         | Includes browser launch  |
| Page load       | 0.5-3s       | Depends on site          |
| Snapshot        | 50-200ms     | Incremental mode         |
| Click/type      | 50-500ms     | Includes wait times      |
| Tab creation    | 100-300ms    | New page in context      |
| Tool call total | 1-5s         | End-to-end               |

## 🎓 Design Decisions

### Why Not Screenshots?

- **Ambiguity**: Multiple elements may look similar
- **Performance**: Image processing is slow
- **Token cost**: Images consume many tokens
- **Precision**: Pixel coordinates are fragile
- **Accessibility**: Text-based is more accessible

### Why Accessibility Tree?

- **Semantic**: Roles and names are meaningful
- **Structured**: Hierarchical relationships preserved
- **Stable**: Less sensitive to visual changes
- **Fast**: No rendering/processing required
- **Deterministic**: Same page = same tree (mostly)

### Why Capabilities System?

- **Modularity**: Load only what you need
- **Security**: Opt-in for advanced features
- **Performance**: Fewer tools = faster startup
- **Maintenance**: Easier to add/remove features

### Why Wrapper Repository?

- **Release independence**: Can release without full Playwright release
- **Distribution**: Separate NPM package for MCP users
- **Configuration**: MCP-specific setup
- **Documentation**: Focused on MCP use case

## 🔮 Future Architecture Considerations

### Potential Enhancements

1. **Multi-page contexts**: Handle multiple pages simultaneously
2. **Persistent connections**: Long-lived sessions with reconnection
3. **Streaming responses**: Real-time updates for long operations
4. **Resource optimization**: Smart caching, lazy loading
5. **Plugin system**: Third-party capability extensions

### Scalability Considerations

- **Horizontal scaling**: Multiple server instances
- **Session affinity**: Route clients to same server
- **Browser pooling**: Pre-warmed browser instances
- **State externalization**: Share state across instances

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Maintained by**: Playwright MCP Team
