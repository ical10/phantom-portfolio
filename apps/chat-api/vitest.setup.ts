// Pure unit tests in this package don't talk to Anthropic, but importing
// `lib/claude.ts` triggers a module-load `requireEnv` for the API key.
// Set a stub before the modules under test are imported.
process.env.ANTHROPIC_API_KEY ??= "test-key";
