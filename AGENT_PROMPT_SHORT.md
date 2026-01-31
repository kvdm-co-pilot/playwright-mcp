# Android MVP Implementation Task

## Your Mission

Implement minimal Android mobile automation support for Playwright MCP. Follow the comprehensive guide in `AGENT_PROMPT_ANDROID_MVP.md` exactly.

## Critical Requirements

1. **Read First**: Study `AGENT_PROMPT_ANDROID_MVP.md` completely before writing any code
2. **Architecture**: Single handler with target-based routing (`web` vs `android`)
3. **Implement 4 Tools**: `android_launch_app`, `android_tap`, `android_input_text`, `android_screenshot`
4. **Test Everything**: Write integration tests for each tool + routing logic
5. **No Regressions**: Existing web tools must continue working unchanged

## Implementation Flow

1. Add dependencies (`webdriverio`, optional `appium`)
2. Create `src/appiumClient.js` for Appium connection
3. Implement 4 Android tools in `src/tools/android/`
4. Add routing logic to handler (check `target` parameter)
5. Write comprehensive tests in `tests/android.spec.ts`
6. Update README.md with Android documentation
7. Validate: Run full test suite (`npm test`)

## Success Criteria

- [ ] All 4 Android tools working
- [ ] Handler routes based on `target` parameter
- [ ] 10+ integration tests passing
- [ ] Existing tests still pass (no regressions)
- [ ] Selector translation working (Playwright → Android)
- [ ] Automatic waits implemented (no exposed sleeps)
- [ ] Documentation updated

## Testing Strategy

Use mocks for Appium responses (no real device required for CI). Follow patterns in `tests/fixtures.ts`.

## Iterate Until Complete

After each phase, test and fix issues before moving forward. Don't stop until all success criteria are met.

**Start by reading `AGENT_PROMPT_ANDROID_MVP.md` thoroughly.**
