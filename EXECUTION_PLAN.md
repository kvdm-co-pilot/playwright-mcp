# Playwright MCP - Execution Plan & Development Skeleton

## 🎯 Project Goals

### Primary Objectives
1. **Provide browser automation capabilities via MCP** - Enable LLMs to interact with web pages through structured, deterministic interfaces
2. **Fast and lightweight approach** - Use Playwright's accessibility tree instead of pixel-based/screenshot approaches
3. **LLM-friendly interface** - Operate purely on structured data without requiring vision models
4. **Deterministic tool application** - Avoid ambiguity common with screenshot-based approaches

### Secondary Objectives
- Multi-client support (VS Code, Cursor, Claude Desktop, etc.)
- Flexible configuration options
- Extensible capability system
- Production-ready reliability and security

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Clients                              │
│  (VS Code, Cursor, Claude Desktop, Goose, etc.)             │
└────────────────────┬────────────────────────────────────────┘
                     │ MCP Protocol (STDIO/HTTP)
┌────────────────────▼────────────────────────────────────────┐
│              Playwright MCP Server                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core (cli.js, index.js)                             │   │
│  │  - Connection Management                             │   │
│  │  - Tool Registration                                 │   │
│  │  - Configuration Handling                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Capabilities System                                 │   │
│  │  - core: Navigation, clicking, typing, snapshots     │   │
│  │  - core-tabs: Tab management                         │   │
│  │  - core-install: Browser installation                │   │
│  │  - vision: Coordinate-based interactions (opt-in)    │   │
│  │  - pdf: PDF generation (opt-in)                      │   │
│  │  - testing: Test assertions (opt-in)                 │   │
│  │  - tracing: Trace recording (opt-in)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Playwright API
┌────────────────────▼────────────────────────────────────────┐
│                  Playwright Core                            │
│  - Browser Automation (Chromium, Firefox, WebKit)           │
│  - Accessibility Tree                                       │
│  - Network Interception                                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Wrapper Pattern**: This repo wraps the core implementation from `microsoft/playwright`
2. **Capabilities Pattern**: Modular opt-in features via `--caps` flag
3. **Transport Abstraction**: Supports STDIO and HTTP/SSE transports
4. **Profile Management**: Supports persistent, isolated, and extension-based browser contexts

## 📋 Development Workflow

### Prerequisites
- Node.js 18 or newer
- Git
- Access to Playwright monorepo (for core changes)

### Setup Process

```bash
# 1. Clone the repository
git clone https://github.com/kvdm-co-pilot/playwright-mcp.git
cd playwright-mcp

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Run linting/README generation
npm run lint

# 5. Run tests
npm test                    # All tests, all browsers
npm run ctest               # Chrome only (faster)
npm run ftest               # Firefox only
npm run wtest               # WebKit only
npm run dtest               # Docker environment
```

### Making Changes

#### For Core Functionality Changes

Since the core implementation lives in `microsoft/playwright`:

```bash
# 1. Clone Playwright monorepo
git clone https://github.com/microsoft/playwright
cd playwright

# 2. Install and build
npm ci
npm run watch  # Watch mode for development

# 3. Make changes in packages/playwright/src/mcp/

# 4. Test changes
npm run mcp-ctest  # Fast: Chromium only
npm run mcp-test   # Complete: All browsers

# 5. Lint
npm run flint

# 6. Submit PR to microsoft/playwright
```

#### For Documentation/Config Changes

Changes to this repo:

```bash
# 1. Make changes to README.md, package.json, etc.

# 2. Run update script (auto-generates parts of README)
npm run update-readme

# 3. Commit with semantic commit messages
git commit -m "docs(readme): update installation instructions"
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Test changes only
- `devops`: CI/build changes
- `chore`: Other changes

**Examples:**
```
feat(capabilities): add new pdf generation capability

This adds support for generating PDFs from web pages using
Playwright's PDF generation API.

Fixes #123
```

## 🧪 Testing Strategy

### Test Architecture

```
tests/
├── fixtures.ts          # Test fixtures and utilities
├── core.spec.ts         # Core functionality tests
├── click.spec.ts        # Click interaction tests
├── capabilities.spec.ts # Capability system tests
├── library.spec.ts      # Programmatic API tests
└── testserver/          # Test HTTP server
    └── index.ts
```

### Test Patterns

```typescript
// 1. Import test fixtures
import { test, expect } from './fixtures';

// 2. Write hermetic tests (no external dependencies)
test('browser_navigate', async ({ client, server }) => {
  // 3. Use custom matchers
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  })).toHaveResponse({
    code: `await page.goto('${server.HELLO_WORLD}');`,
    pageState: expect.stringContaining('Page URL'),
  });
});
```

### Test Guidelines

1. **Hermetic**: Tests must not depend on external services
2. **Cross-platform**: Must work on macOS, Linux, and Windows
3. **Cross-browser**: Core tests run on Chromium, Firefox, and WebKit
4. **Fast feedback**: Use `npm run ctest` for rapid iteration
5. **Black-box**: Test via MCP protocol, not internal APIs

### Adding New Tests

```bash
# 1. Create test file
touch tests/my-feature.spec.ts

# 2. Use fixtures
import { test, expect } from './fixtures';

# 3. Write test
test('my feature', async ({ client, server }) => {
  // Test implementation
});

# 4. Run specific test
npx playwright test my-feature.spec.ts
```

## 🔌 Extending Capabilities

### Adding a New Capability

1. **Implement in Playwright monorepo** (`packages/playwright/src/mcp/`)
2. **Define capability type** in `config.d.ts`:
   ```typescript
   export type ToolCapability = 'core' | 'vision' | 'pdf' | 'testing' | 'tracing' | 'my-new-cap';
   ```
3. **Add CLI flag** support in program decorator
4. **Document in README** (auto-generated via `update-readme.js`)
5. **Add tests** in this repo's `tests/` directory

### Capability Design Principles

- **Opt-in by default**: New capabilities should be optional (`--caps=my-cap`)
- **Single responsibility**: Each capability focuses on one domain
- **Tool-based**: Expose functionality via MCP tools, not resources/prompts
- **Read/write distinction**: Mark tools as read-only when appropriate
- **Atomic operations**: Each tool should do one thing well

### Example Capability Structure

```javascript
// In microsoft/playwright packages/playwright/src/mcp/capabilities/my-capability.ts

export function createMyCapabilityTools() {
  return [
    {
      name: 'browser_my_action',
      description: 'Performs my action',
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string', description: 'Parameter description' }
        },
        required: ['param']
      },
      handler: async (params, context) => {
        // Implementation
        return {
          content: [{ type: 'text', text: 'Result' }]
        };
      }
    }
  ];
}
```

## 🔒 Security Considerations

### Current Security Measures

1. **Origin filtering**: `--allowed-origins` and `--blocked-origins`
2. **Host validation**: `--allowed-hosts` for DNS rebinding protection
3. **Secrets management**: `--secrets` file for sensitive data
4. **Sandbox control**: `--no-sandbox` flag for environments requiring it
5. **HTTPS error handling**: `--ignore-https-errors` (use with caution)

### Security Best Practices

1. **Never commit secrets**: Use `.gitignore`, environment variables, or secrets files
2. **Validate inputs**: All tool parameters should be validated
3. **Principle of least privilege**: Use isolated contexts when possible
4. **Audit dependencies**: Keep Playwright and dependencies updated
5. **Network isolation**: Use origin filtering in production

## 📊 Monitoring & Debugging

### Debug Modes

```bash
# Enable debug logging
DEBUG=pw:mcp:* npx @playwright/mcp@latest

# Save session artifacts
npx @playwright/mcp@latest --save-session --save-trace --save-video=1280x720 --output-dir=./output

# Console message levels
npx @playwright/mcp@latest --console-level=debug
```

### Trace Analysis

```bash
# 1. Run with trace enabled
npx @playwright/mcp@latest --save-trace --output-dir=./traces

# 2. View trace
npx playwright show-trace ./traces/trace.zip
```

## 🚀 Release Process

### Version Management

- Versions synced with Playwright releases
- Current: `0.0.54` (based on Playwright 1.58.0-alpha-2025-12-29)
- Follow semantic versioning for this wrapper package

### Publishing Steps

```bash
# 1. Run full test suite
npm test

# 2. Update version
npm version patch|minor|major

# 3. Publish
npm publish

# 4. Tag release
git tag v0.0.x
git push --tags
```

### CI/CD Pipeline

- **CI**: Runs on every PR (`.github/workflows/ci.yml`)
  - Linting
  - Tests across browsers
  - Docker build validation
- **Publish**: Automated on release (`.github/workflows/publish.yml`)
  - NPM publication
  - Docker image push

## 🎓 Learning Resources

### Understanding the Codebase

1. **Start with README.md**: Understand user-facing features
2. **Review tests/**: See how features are used
3. **Check config.d.ts**: Understand configuration options
4. **Read CONTRIBUTING.md**: Learn contribution workflow
5. **Explore Playwright docs**: https://playwright.dev/docs/intro

### Key Concepts

- **MCP Protocol**: https://modelcontextprotocol.io/
- **Accessibility Tree**: Playwright's core abstraction for page interaction
- **Tool Capabilities**: Modular feature system
- **Browser Contexts**: Isolated browser sessions

## 📝 Common Tasks

### Task: Add a new browser automation tool

```bash
# 1. Implement in Playwright monorepo
cd playwright
code packages/playwright/src/mcp/tools/my-tool.ts

# 2. Register tool in capability
# Edit packages/playwright/src/mcp/capabilities/core.ts

# 3. Add tests in this repo
cd playwright-mcp
code tests/my-tool.spec.ts

# 4. Update types if needed
# Edit config.d.ts

# 5. Test
npm run ctest

# 6. Generate docs
npm run update-readme
```

### Task: Fix a bug

```bash
# 1. Create issue (if doesn't exist)
# 2. Create branch
git checkout -b fix/issue-123

# 3. Write failing test
code tests/bug-reproduction.spec.ts
npm run ctest  # Verify it fails

# 4. Implement fix in Playwright monorepo
cd playwright
# Make changes in packages/playwright/src/mcp/

# 5. Copy changes to local test (if needed)
cd playwright-mcp
# Use --config to point to local Playwright build

# 6. Verify fix
npm run ctest

# 7. Submit PR to microsoft/playwright
# 8. Update this repo if needed
```

### Task: Update documentation

```bash
# 1. Edit README.md manually (non-generated sections)
# 2. Run generator
npm run update-readme

# 3. Review changes
git diff README.md

# 4. Commit
git commit -m "docs(readme): clarify installation steps"
```

## 🔄 Synchronization with Playwright

### Update Process

```bash
# 1. Pull latest Playwright changes
cd playwright
git pull

# 2. Build
npm ci
npm run build

# 3. Copy new config types (if changed)
cd playwright-mcp
npm run copy-config

# 4. Update package.json dependencies
# Edit package.json - update playwright versions

# 5. Test
npm install
npm test

# 6. Update README
npm run roll

# 7. Commit and release
git commit -m "chore: sync with Playwright 1.x.x"
```

## 🛠️ Troubleshooting

### Common Issues

**Issue: Browser not installed**
```bash
# Solution:
npx playwright install chromium
# Or use browser_install tool via MCP
```

**Issue: Tests failing locally**
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run specific browser
npm run ctest  # Chrome only
```

**Issue: Core functionality not working**
```bash
# Check if changes need to be in Playwright monorepo
# This repo is just a wrapper - core logic lives in microsoft/playwright
```

## 📈 Future Roadmap Ideas

### Potential Enhancements

1. **Enhanced Capabilities**
   - WebSocket support
   - File system access
   - Database interactions
   - API testing tools

2. **Developer Experience**
   - Better error messages
   - Interactive debugging mode
   - Trace viewer integration
   - Performance profiling

3. **Security**
   - Content Security Policy support
   - Certificate pinning
   - Request signing

4. **Integrations**
   - More MCP clients
   - Cloud browser services
   - CI/CD pipelines

## 📚 Code Style & Best Practices

### TypeScript/JavaScript Style

- Follow ESLint config from Playwright monorepo (`eslint.config.mjs`)
- Use TypeScript for type safety
- Prefer async/await over promises
- Use meaningful variable names
- Add comments only when code isn't self-explanatory

### Testing Best Practices

- One assertion per test (when possible)
- Use descriptive test names
- Clean up resources (auto-handled by fixtures)
- Mock external dependencies
- Test edge cases and error conditions

### Documentation Best Practices

- Keep README.md user-focused
- Use CONTRIBUTING.md for developer guidance
- Auto-generate where possible (reduce maintenance)
- Include examples
- Link to external resources

## 🤝 Contributing

### First-Time Contributors

1. **Find an issue**: Look for "good first issue" labels
2. **Discuss first**: Comment on the issue to avoid duplicate work
3. **Fork and clone**: Standard GitHub workflow
4. **Make focused changes**: One issue per PR
5. **Write tests**: Required for all changes
6. **Follow commit format**: Semantic commit messages
7. **Sign CLA**: Required for Microsoft projects

### Code Review Process

1. Automated checks run on PR
2. Maintainer review (typically within 1 week)
3. Address feedback
4. Merge by maintainer

## 📞 Support & Resources

- **Documentation**: https://playwright.dev
- **Issues**: https://github.com/microsoft/playwright/issues
- **Discord**: Playwright community
- **Stack Overflow**: Tag `playwright`

---

**Last Updated**: January 2026
**Version**: Based on Playwright MCP 0.0.54
