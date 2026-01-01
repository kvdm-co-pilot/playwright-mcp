# Best Practices Guide

## 🎯 Overview

This document outlines industry best practices used in Playwright MCP and recommendations for contributors and users.

## 📐 Architectural Best Practices

### 1. Separation of Concerns

**Practice**: Core implementation separate from distribution package

**Why**: 
- Core in `microsoft/playwright` for centralized maintenance
- This repo focuses on packaging, docs, and integration tests
- Changes are easier to review and test

**Implementation**:
```
microsoft/playwright repo     →  Core implementation
playwright-mcp repo           →  Packaging & distribution
```

### 2. Modular Capabilities System

**Practice**: Opt-in feature modules via `--caps` flag

**Why**:
- Smaller attack surface (security)
- Faster startup (performance)
- Easier to maintain (modularity)
- User choice (flexibility)

**Implementation**:
```bash
# Minimal setup (default)
npx @playwright/mcp

# With vision capabilities
npx @playwright/mcp --caps=vision

# Multiple capabilities
npx @playwright/mcp --caps=vision,pdf,testing
```

### 3. Transport Abstraction

**Practice**: Support multiple transport layers (STDIO, HTTP/SSE)

**Why**:
- STDIO for direct client integration
- HTTP for remote/standalone deployment
- Future extensibility (WebSocket, gRPC)

**Implementation**:
```javascript
// STDIO (default)
const transport = new StdioServerTransport();

// HTTP/SSE (with --port)
const transport = new SSEServerTransport('/messages', res);

// Both use same MCP server core
await connection.connect(transport);
```

### 4. Configuration as Code

**Practice**: Type-safe configuration with JSON schema

**Why**:
- IDE autocomplete
- Validation at parse time
- Documentation generation
- Version control friendly

**Implementation**:
```typescript
// config.d.ts provides full type safety
export type Config = {
  browser?: {
    browserName?: 'chromium' | 'firefox' | 'webkit';
    launchOptions?: LaunchOptions;
    // ...
  };
  // ...
};
```

## 🧪 Testing Best Practices

### 1. Black-Box Testing

**Practice**: Test via MCP protocol, not internal APIs

**Why**:
- Tests actual user experience
- Catches integration issues
- Protocol compliance verification
- Implementation can change freely

**Example**:
```typescript
// Good: Test via MCP client
const response = await client.callTool({
  name: 'browser_click',
  arguments: { element: 'button', ref: 'e1' }
});

// Bad: Test internal implementation
const handler = getToolHandler('browser_click');
await handler({ element: 'button', ref: 'e1' });
```

### 2. Hermetic Tests

**Practice**: No external dependencies, self-contained test server

**Why**:
- Reliable CI/CD
- Offline development
- Consistent results
- Fast execution

**Implementation**:
```typescript
// Good: Use test server
test('navigate', async ({ client, server }) => {
  server.setContent('/', '<h1>Hello</h1>');
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX }
  });
});

// Bad: Depend on external site
test('navigate', async ({ client }) => {
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://example.com' } // ❌ External dependency
  });
});
```

### 3. Custom Matchers

**Practice**: Domain-specific assertions

**Why**:
- More readable tests
- Better error messages
- Encapsulate common patterns
- Easier to maintain

**Implementation**:
```typescript
// Good: Custom matcher
expect(response).toHaveResponse({
  code: expect.stringContaining('click'),
  pageState: expect.stringContaining('button')
});

// Bad: Manual assertions
const text = response.content[0].text;
const sections = parseSections(text);
expect(sections.get('Result')).toBeDefined();
expect(sections.get('Code')).toContain('click');
```

### 4. Cross-Browser Testing

**Practice**: Test on Chromium, Firefox, and WebKit

**Why**:
- Catch browser-specific bugs
- Ensure consistent behavior
- Wider compatibility
- User confidence

**Implementation**:
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chrome' },
    { name: 'firefox' },
    { name: 'webkit' }
  ]
});
```

## 🔒 Security Best Practices

### 1. Defense in Depth

**Practice**: Multiple security layers

**Layers**:
1. Network filtering (allowed/blocked origins)
2. Host validation (DNS rebinding protection)
3. Secrets management (dotenv files)
4. Sandbox (process isolation)
5. HTTPS validation

**Implementation**:
```bash
# All security layers enabled
npx @playwright/mcp \
  --allowed-origins="https://trusted.com" \
  --blocked-origins="https://malicious.com" \
  --allowed-hosts="localhost,127.0.0.1" \
  --secrets=./secrets.env
  # --no-sandbox only in trusted environments
```

### 2. Secrets Management

**Practice**: Never expose secrets in snapshots or logs

**Why**:
- Prevent credential theft
- Comply with security policies
- Avoid accidental commits
- Enable safe logging

**Implementation**:
```bash
# Good: Use secrets file
echo "API_KEY=secret123" > .secrets.env
npx @playwright/mcp --secrets=.secrets.env

# Bad: Hardcode in snapshot
# ❌ Don't do this - secret visible to LLM
```

### 3. Principle of Least Privilege

**Practice**: Minimal permissions by default

**Why**:
- Reduce attack surface
- Limit damage from exploits
- Follow security standards
- Enable safe defaults

**Implementation**:
```bash
# Good: Minimal default
npx @playwright/mcp

# Good: Opt-in to advanced features
npx @playwright/mcp --caps=vision

# Bad: Everything enabled by default
# ❌ Vision coordinates could be misused
```

### 4. Input Validation

**Practice**: Validate all tool parameters

**Why**:
- Prevent injection attacks
- Catch errors early
- Better error messages
- Type safety

**Implementation**:
```typescript
// Good: Schema validation
inputSchema: {
  type: 'object',
  properties: {
    url: { type: 'string', format: 'uri' },
    timeout: { type: 'number', minimum: 0, maximum: 60000 }
  },
  required: ['url']
}

// MCP SDK validates before calling handler
```

## 📝 Documentation Best Practices

### 1. Auto-Generated Docs

**Practice**: Generate docs from code

**Why**:
- Always up-to-date
- Single source of truth
- Reduce maintenance
- Catch inconsistencies

**Implementation**:
```javascript
// update-readme.js generates:
// - Tool documentation
// - Configuration schema
// - CLI options
npm run update-readme
```

### 2. Multiple Documentation Levels

**Practice**: Docs for different audiences

**Levels**:
- **README.md**: User-facing, getting started
- **CONTRIBUTING.md**: Contributor guide
- **ARCHITECTURE.md**: System design
- **QUICKSTART.md**: Developer onboarding
- **Best Practices** (this doc): Standards & patterns

### 3. Code Examples

**Practice**: Show, don't just tell

**Why**:
- Easier to understand
- Copy-paste ready
- Catches errors
- Validates docs

**Example**:
```markdown
# Good: With example
To navigate to a URL, use the browser_navigate tool:

\`\`\`javascript
await client.callTool({
  name: 'browser_navigate',
  arguments: { url: 'https://example.com' }
});
\`\`\`

# Bad: Without example
Use browser_navigate to navigate.
```

### 4. Link to External Resources

**Practice**: Reference authoritative sources

**Why**:
- Avoid duplication
- Always current
- Build on expertise
- Acknowledge sources

**Example**:
```markdown
For more information on Playwright, see:
- [Playwright Documentation](https://playwright.dev)
- [MCP Protocol](https://modelcontextprotocol.io)
```

## 🔧 Development Workflow Best Practices

### 1. Semantic Commit Messages

**Practice**: Follow Conventional Commits

**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

**Why**:
- Clear history
- Automated changelogs
- Semantic versioning
- Better collaboration

**Examples**:
```bash
# Good
git commit -m "feat(capabilities): add pdf generation"
git commit -m "fix(snapshot): handle empty accessibility tree"
git commit -m "docs(readme): update installation steps"

# Bad
git commit -m "update stuff"
git commit -m "fix bug"
```

### 2. Small, Focused PRs

**Practice**: One change per pull request

**Why**:
- Easier to review
- Faster merge
- Easier to revert
- Clear intent

**Guidelines**:
- < 300 lines changed (ideal)
- Single responsibility
- Tests included
- Docs updated

### 3. Issue-First Development

**Practice**: Create issue before coding

**Why**:
- Discuss approach
- Get early feedback
- Avoid duplicate work
- Clear requirements

**Workflow**:
```
1. Create issue describing problem/feature
2. Discuss with maintainers
3. Get approval
4. Create branch
5. Implement
6. Reference issue in PR
```

### 4. Continuous Integration

**Practice**: Automated testing on every commit

**Why**:
- Catch bugs early
- Maintain quality
- Safe merging
- Consistent testing

**Pipeline**:
```yaml
# .github/workflows/ci.yml
- Checkout code
- Install dependencies
- Run linter
- Run tests (all browsers)
- Build Docker image
- Report results
```

## 🎨 Code Style Best Practices

### 1. Type Safety

**Practice**: Use TypeScript types

**Why**:
- Catch errors at compile time
- Better IDE support
- Self-documenting code
- Refactoring safety

**Example**:
```typescript
// Good
interface NavigateParams {
  url: string;
  timeout?: number;
}

async function navigate(params: NavigateParams): Promise<void> {
  // TypeScript ensures params.url exists
}

// Bad
async function navigate(params) {
  // No type checking
}
```

### 2. Error Handling

**Practice**: Explicit error handling with context

**Why**:
- Better debugging
- User-friendly messages
- Graceful degradation
- Logging context

**Example**:
```typescript
// Good
try {
  await page.goto(url);
} catch (error) {
  throw new Error(`Failed to navigate to ${url}: ${error.message}`);
}

// Bad
try {
  await page.goto(url);
} catch (error) {
  throw error; // Lost context
}
```

### 3. Async/Await

**Practice**: Use async/await over promises

**Why**:
- More readable
- Better error handling
- Consistent style
- Modern standard

**Example**:
```typescript
// Good
async function doWork() {
  const result1 = await step1();
  const result2 = await step2(result1);
  return result2;
}

// Bad
function doWork() {
  return step1()
    .then(result1 => step2(result1))
    .then(result2 => result2);
}
```

### 4. Meaningful Names

**Practice**: Clear, descriptive identifiers

**Why**:
- Self-documenting
- Easier to understand
- Reduces comments
- Better search

**Example**:
```typescript
// Good
async function navigateToUrl(destinationUrl: string) {
  await page.goto(destinationUrl);
}

// Bad
async function n(u: string) {
  await page.goto(u);
}
```

## 🚀 Performance Best Practices

### 1. Incremental Snapshots

**Practice**: Only capture changes

**Why**:
- Faster response time
- Lower token usage
- Better UX
- Resource efficient

**Implementation**:
```bash
# Default: Incremental
npx @playwright/mcp --snapshot-mode=incremental

# Full snapshot (slower but complete)
npx @playwright/mcp --snapshot-mode=full

# No snapshots (fastest but no context)
npx @playwright/mcp --snapshot-mode=none
```

### 2. Lazy Loading

**Practice**: Load capabilities on demand

**Why**:
- Faster startup
- Lower memory
- Only pay for what you use
- Better scalability

**Implementation**:
```javascript
// Capabilities registered only if enabled
if (config.capabilities?.includes('vision')) {
  registerVisionTools();
}
```

### 3. Connection Pooling

**Practice**: Reuse browser contexts

**Why**:
- Avoid startup cost
- Share resources
- Better throughput
- Lower latency

**Implementation**:
```bash
# Shared context for HTTP clients
npx @playwright/mcp --port 8931 --shared-browser-context
```

### 4. Resource Cleanup

**Practice**: Clean up after operations

**Why**:
- Prevent memory leaks
- Stable long-running sessions
- Predictable behavior
- Better reliability

**Implementation**:
```typescript
// Good: Cleanup in finally
try {
  const page = await context.newPage();
  await doWork(page);
} finally {
  await page.close(); // Always cleanup
}
```

## 📊 Monitoring Best Practices

### 1. Structured Logging

**Practice**: Use debug namespaces

**Why**:
- Filter by component
- Adjust verbosity
- Trace execution
- Debug issues

**Implementation**:
```bash
# All MCP logs
DEBUG=pw:mcp:* npx @playwright/mcp

# Specific component
DEBUG=pw:mcp:tools npx @playwright/mcp
```

### 2. Trace Recording

**Practice**: Enable traces for debugging

**Why**:
- Visual timeline
- Network logs
- Screenshots
- Full context

**Implementation**:
```bash
# Record trace
npx @playwright/mcp --save-trace --output-dir=./traces

# View trace
npx playwright show-trace ./traces/trace.zip
```

### 3. Console Monitoring

**Practice**: Capture browser console

**Why**:
- Catch JavaScript errors
- Debug page issues
- Monitor warnings
- Understand page behavior

**Implementation**:
```bash
# Capture all console levels
npx @playwright/mcp --console-level=debug
```

## 🎓 Learning Best Practices

### 1. Read the Tests

**Practice**: Tests are living documentation

**Why**:
- See real usage
- Understand expectations
- Learn patterns
- Find examples

### 2. Incremental Understanding

**Practice**: Start simple, go deeper

**Steps**:
1. Use the tool (README)
2. Run tests (see it work)
3. Read code (understand how)
4. Modify code (learn by doing)

### 3. Ask Questions

**Practice**: No question is too basic

**Where**:
- GitHub Discussions
- Discord community
- Stack Overflow
- PR comments

### 4. Share Knowledge

**Practice**: Document what you learn

**How**:
- Update docs
- Add comments
- Write blog posts
- Help others

## ✅ Pre-Release Checklist

Before releasing a new version:

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (`npm run update-readme`)
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes written
- [ ] Docker image built and tested
- [ ] NPM package published
- [ ] GitHub release created

## 🎯 Summary

The best practices in this guide reflect:
- **Industry standards**: Proven patterns from the wider community
- **Security focus**: Defense in depth, least privilege
- **Developer experience**: Fast feedback, clear errors
- **Maintainability**: Modular design, clear architecture
- **Quality**: Comprehensive testing, continuous integration
- **Documentation**: Multiple levels, always current

Following these practices ensures Playwright MCP remains:
- ✅ Secure and reliable
- ✅ Fast and performant
- ✅ Easy to contribute to
- ✅ Well documented
- ✅ Maintainable long-term

---

**Last Updated**: January 2026  
**Version**: 1.0
