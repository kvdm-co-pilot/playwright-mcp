# Developer Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will get you from zero to running tests in ~5 minutes.

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- Basic command line knowledge

## Setup Steps

### 1. Clone and Install (1 minute)

```bash
# Clone the repository
git clone https://github.com/kvdm-co-pilot/playwright-mcp.git
cd playwright-mcp

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Verify Installation (30 seconds)

```bash
# Check that everything is working
node cli.js --help

# You should see help output with all available options
```

### 3. Run Your First Test (1 minute)

```bash
# Run a single test to verify everything works
npx playwright test tests/core.spec.ts --project=chrome

# You should see:
# ✓ browser_navigate (2s)
# 1 passed
```

### 4. Start Development (Optional)

```bash
# Run tests in watch mode
npx playwright test --ui

# Or run all tests
npm test
```

## 🎯 Your First Contribution

### Task: Add a Simple Test

Let's add a test to verify page navigation works:

```bash
# 1. Create a new test file
cat > tests/my-first-test.spec.ts << 'EOF'
import { test, expect } from './fixtures';

test('navigate to example.com', async ({ client }) => {
  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://example.com' },
  });
  
  expect(response.content[0].text).toContain('Example Domain');
});
EOF

# 2. Run your test
npx playwright test tests/my-first-test.spec.ts --project=chrome

# 3. Clean up (or commit if you want to keep it)
rm tests/my-first-test.spec.ts
```

## 🧪 Common Development Tasks

### Run Tests

```bash
# All tests, all browsers (slow but complete)
npm test

# Chrome only (fast)
npm run ctest

# Firefox only
npm run ftest

# WebKit only
npm run wtest

# Specific test file
npx playwright test tests/click.spec.ts

# Specific test by name
npx playwright test -g "browser_click"

# Debug mode (opens browser inspector)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui
```

### Lint and Format

```bash
# Update README (includes linting)
npm run lint

# Manual update
npm run update-readme
```

### Test the CLI Directly

```bash
# Start the server manually
node cli.js --headless

# In another terminal, test with an MCP client
# (requires an MCP client to be installed)
```

### Check Available Tools

```bash
# List all available MCP tools
node -e "
const { createConnection } = require('./index.js');
createConnection().then(server => {
  console.log('Available tools:', server.requestHandlers.size);
});
"
```

## 📖 Understanding the Code

### Repository Structure

```
playwright-mcp/
├── cli.js              ← CLI entry point (start here!)
├── index.js            ← Programmatic API
├── package.json        ← Dependencies & scripts
├── README.md           ← User documentation
├── CONTRIBUTING.md     ← Contribution guide
├── EXECUTION_PLAN.md   ← Development roadmap
├── ARCHITECTURE.md     ← System architecture
├── tests/              ← Test suite
│   ├── fixtures.ts     ← Test helpers
│   ├── core.spec.ts    ← Core tests
│   ├── click.spec.ts   ← Click tests
│   └── ...
└── config.d.ts         ← TypeScript definitions
```

### Key Files to Know

1. **cli.js** - Command-line interface
   - Parses arguments
   - Starts MCP server
   - Main entry point for users

2. **index.js** - Programmatic API
   - Exports `createConnection()`
   - Used by tests and integrations

3. **tests/fixtures.ts** - Test infrastructure
   - Sets up MCP client
   - Provides test server
   - Custom matchers

4. **config.d.ts** - Configuration types
   - TypeScript definitions
   - All available options
   - Copied from Playwright monorepo

### Code Flow

```
User runs: npx @playwright/mcp
         │
         ▼
    cli.js loads
         │
         ▼
Playwright's program.ts decorates CLI
         │
         ▼
Parse arguments → Create config
         │
         ▼
createConnection(config)
         │
         ▼
Start MCP server with STDIO transport
         │
         ▼
Launch browser & wait for tool calls
```

## 🎨 Code Style

### TypeScript Patterns

```typescript
// Good: Async/await
async function doSomething() {
  const result = await someAsyncOperation();
  return result;
}

// Good: Type safety
interface MyConfig {
  option: string;
  value: number;
}

function configure(config: MyConfig) {
  // ...
}

// Good: Error handling
try {
  await riskyOperation();
} catch (error) {
  console.error('Failed:', error.message);
  throw error;
}
```

### Test Patterns

```typescript
import { test, expect } from './fixtures';

test('descriptive test name', async ({ client, server }) => {
  // Arrange: Set up test conditions
  server.setContent('/', '<button>Click me</button>');
  
  // Act: Perform action
  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Assert: Verify results
  expect(response).toHaveResponse({
    pageState: expect.stringContaining('button'),
  });
});
```

## 🐛 Debugging

### Debug Test Failures

```bash
# 1. Run test with --debug flag
npx playwright test tests/my-test.spec.ts --debug

# 2. Browser opens with inspector
# 3. Step through test execution
# 4. Inspect page state
```

### Debug Server Issues

```bash
# Enable debug logging
DEBUG=pw:mcp:* node cli.js --headless

# Or for more detail
DEBUG=pw:* node cli.js --headless
```

### Common Issues

**Issue: "playwright: not found"**
```bash
# Solution: Install Playwright browsers
npx playwright install
```

**Issue: "Cannot find module"**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: Tests timing out**
```bash
# Solution: Increase timeout
npx playwright test --timeout=30000
```

**Issue: Browser won't start**
```bash
# Solution: Check system dependencies
npx playwright install-deps
```

## 📚 Learning Path

### Week 1: Understand the Basics
- [ ] Read README.md thoroughly
- [ ] Run all tests successfully
- [ ] Try CLI with different options
- [ ] Read ARCHITECTURE.md

### Week 2: Explore the Code
- [ ] Read through test files
- [ ] Understand fixtures.ts
- [ ] Trace a tool call from CLI to Playwright
- [ ] Read CONTRIBUTING.md

### Week 3: Make Changes
- [ ] Fix a small bug
- [ ] Add a new test
- [ ] Improve documentation
- [ ] Submit your first PR

## 🎯 Next Steps

### Learn More About:

1. **MCP Protocol**
   - https://modelcontextprotocol.io/
   - Understand how LLMs communicate with tools

2. **Playwright**
   - https://playwright.dev/docs/intro
   - Learn browser automation basics

3. **Accessibility Trees**
   - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
   - Understand how browsers expose content

### Join the Community

- **GitHub Discussions**: Ask questions, share ideas
- **Discord**: Real-time chat with other developers
- **Stack Overflow**: Tag questions with `playwright`

## 💡 Pro Tips

### Tip 1: Use Watch Mode
```bash
# Tests auto-run on file changes
npx playwright test --ui
```

### Tip 2: Filter Tests
```bash
# Run only tests matching pattern
npx playwright test -g "click"
```

### Tip 3: Headed Mode
```bash
# See browser while testing (remove --headless)
npx playwright test --headed
```

### Tip 4: Trace Viewer
```bash
# Generate trace on failure
npx playwright test --trace on-first-retry

# View trace
npx playwright show-trace trace.zip
```

### Tip 5: Use TypeScript
```bash
# VSCode will provide autocomplete for all Playwright APIs
# Make sure to have @playwright/test installed
```

## 🚨 Before You Submit a PR

### Checklist:
- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Commit message follows format: `type(scope): message`
- [ ] PR description is clear
- [ ] Tests added for new features
- [ ] Documentation updated if needed

### Example Good Commit:
```bash
git add tests/my-new-feature.spec.ts
git commit -m "test(core): add test for browser_navigate with query params

This test verifies that navigation works correctly when the URL
includes query parameters and hash fragments.

Fixes #123"
```

## 🎉 You're Ready!

You now know enough to start contributing. Remember:

- **Start small**: Fix typos, improve docs
- **Ask questions**: No question is too basic
- **Share knowledge**: Help others learn
- **Have fun**: Browser automation is cool!

## 📞 Get Help

- **Stuck?** Open a [GitHub Discussion](https://github.com/microsoft/playwright/discussions)
- **Found a bug?** File an [issue](https://github.com/microsoft/playwright/issues)
- **Want to chat?** Join the [Discord](https://aka.ms/playwright/discord)

---

**Happy coding! 🎭**
