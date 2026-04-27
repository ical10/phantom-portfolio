# Smart Portfolio

A multi-chain portfolio dashboard with a Phantom MCP-backed AI chat, powered by CoinGecko and Jupiter for prices feed.

## Live demo

TBA.

## Engineering highlights

- Hand-rolled agent harness: built on top of `@anthropic-ai/sdk` and `@modelcontextprotocol/sdk` with configurable spam protection (`MAX_TURNS`, `MAX_TOKENS`, and `TOOL_CALL_TIMEOUT_MS`) and per-IP rate limiter. See `apps/chat-api/src/lib/claude.ts`.
- Multi-chain frontend: Solana via Helius DAS, Ethereum + Polygon via Alchemy + viem, Phantom for AI chatbot and wallet authentication.
- Monorepo-based, full-stack app with LRU-cached upstream calls and abort propagation through SSE.

## Architecture

Two services deployed on a platform of your choice. The browser talks to each directly: `apps/web` for dashboard pages and the existing balance/price server functions; `apps/chat-api` for the SSE chat stream and agent-wallet metadata. The chat-api boots from pre-baked MCP credentials (see § Known limitations), so there's no interactive auth on the host.

```
Browser
  ├── HTTP (page loads + server fns) ──> apps/web (TanStack Start SSR)
  │       └── dashboard server fns call: Helius, Alchemy, Jupiter, CoinGecko
  │           (all LRU-cached)
  │
  └── fetch SSE ──────────────────────> apps/chat-api (Hono)
          ├── POST /chat (rate-limited) ── calls Anthropic Messages API
          ├── GET /agent-wallet/addresses
          └── spawns @phantom/mcp-server (stdio child) ── Phantom KMS
```

## Tech stack

┌──────────┬────────────────────────────────────────────────────────┬──────────────────────────────┐
│ Layer │ Tech │ Notes │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ Frontend │ TanStack Start, React 19, Tailwind 4, shadcn/ui │ SSR-on-first-load, SPA after │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ Wallet │ @phantom/react-sdk v2 │ Connect + watcher modes │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ Solana │ @solana/web3.js, @solana/spl-token, Helius DAS │ Token-2022 supported │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ EVM │ viem, Alchemy │ Ethereum + Polygon │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ Prices │ Jupiter (Solana), CoinGecko (EVM) │ Both LRU-cached server-side │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ LLM │ @anthropic-ai/sdk │ Custom tool-call loop │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ MCP │ @phantom/mcp-server (stdio), @modelcontextprotocol/sdk │ Module-singleton subprocess │
├──────────┼────────────────────────────────────────────────────────┼──────────────────────────────┤
│ Backend │ Hono │ SSE streaming, IP rate limit │
└──────────┴────────────────────────────────────────────────────────┴──────────────────────────────┘

## Known limitations

This is a proof of concept and would still need to scale for more users. The chat-api ties a single Phantom MCP subprocess to one shared agent wallet provisioned during the one-time device-code bootstrap, so every connected user sees and (once funded) shares the same wallet. The AI chatbot is merely a technical demo showcasing how users can interact with the Phantom MCP Server — making this multi-tenant requires per-user MCP sessions or a programmatic agent-wallet provisioning API that Phantom's MCP doesn't currently expose.

To bound the blast radius of the shared wallet, the agent harness exposes only the Phantom MCP `transfer` tool as a write, capped at `0.01 SOL` on `solana:mainnet` per call (configured in `packages/shared/src/chat-schemas.ts` as `DEMO_WRITE_CAPS`). Other MCP write tools (`buy`, `wallet_rebalance`, `solana_send`, `evm_send`, perps, signing) are intentionally not wired up. The cap is enforced server-side in `apps/chat-api/src/lib/claude.ts` regardless of what the LLM tries to call.

Phantom MCP's `transfer` tool defaults to a two-step flow: first call returns a simulation preview from `https://api.phantom.app/simulation/v1`, second call with `confirmed: true` actually broadcasts. That simulation endpoint **returns `403 invalid_request` for the free-tier agent wallet used in this demo** — the broadcast path itself works fine. So the system prompt instructs Claude to skip the simulation pre-flight and call `transfer` once with `confirmed: true`, while writing a plain-language preview _before_ the tool call so the user can verify intent from scrollback. Production would either pay for API access via the MCP `pay` tool (signs a CASH token transaction to unlock the simulator) or run a Solana simulator locally — the demo cap keeps the lack of pre-flight bounded.

### Security tradeoffs of the pre-baked session

The pre-baked-session approach works for a single-operator demo, but has real costs:

- **Phantom has no service-account auth mode**, so we're re-using a _user_ OAuth session server-side.
- **The refresh token + signing key now live in three places**: the operator's laptop, Railway env vars, and the container's filesystem. Anyone with Railway dashboard access can decode the env var and impersonate the agent wallet.
- **No rotation, no audit logs.** Production would pull from a real secrets manager (AWS Secrets Manager / Vault / Doppler). Refresh-token rotation inside the container doesn't write back to the env var either, so on a long-lived deploy mount a volume at `~/.phantom-mcp/`.

Blast radius is bounded by the demo cap — only `transfer_tokens` is exposed, capped at 0.01 SOL per call (see `apps/chat-api/src/lib/claude.ts`). A real product would replace this layer with Phantom-issued service credentials (if/when they ship) or per-user MCP sessions via the Anthropic `mcp_servers` connector.

## Future improvements

### UX improvements

- **Scam / unverified-token detection.** Accounts with a lot of airdrop noise (e.g. `toly.sol` holds ~822 non-zero mints) could benefit from an explicit "verified token" badge separate from the dust filter. Jupiter exposes `isVerified` on its `/tokens/v2/search` endpoint, but in testing that endpoint dropped 15%+ of requested mints even for a set of well-known verified tokens — it's a search endpoint, not a bulk lookup. A more reliable path is a dedicated verified-list source (Jupiter Strict List, Solana token-list registry, or a paid token-metadata API) queried as a single fetch and cached server-side. Until then, the unpriced-dust filter provides a reasonable proxy since tokens without any DEX liquidity don't appear on Jupiter.
- **Pagination beyond "show more".** The current cap of 20 rows with expand-all works for wallets up to a few hundred tokens, but 800+ token accounts render ~800 table rows when expanded. A virtualized table (`@tanstack/react-virtual`) would handle that comfortably.
- **Liquidity threshold.** In addition to "has a Jupiter price," a minimum-liquidity floor (e.g. `liquidity > $1k`) would drop thinly-traded long-tail tokens that are priced but effectively untradeable.

### Agent harness instrumentation (chat feature)

- **Tool-use observability.** Instrument the agent loop in `apps/chat-api/src/lib/claude.ts` to log structured per-tool-call records (`{turn, tool_name, input_size_bytes, latency_ms, output_size_bytes, isError}`) and per-request totals (`{messages_in, total_input_tokens, total_output_tokens, num_tool_calls, total_latency_ms}`). The Anthropic stream emits token usage in `message_delta` events (`usage.output_tokens`); capture those rather than guessing. Pipe to stdout for log capture or to a local OTLP collector. Without telemetry, "agent is slow" is unactionable; with it, you can see _which_ tool call ate the budget.

- **Tool-routing evals.** Add `apps/chat-api/test/evals.test.ts` with scripted prompts and expected behaviors. The harness is small: `streamChat()` already accepts an `emit` callback, so the test wraps it with a recorder that captures every `tool-call-start` event into an array and asserts against the array. No mocking, no LangChain test framework, just an explicit transcript. Run in CI to catch model drift after Anthropic version bumps.
  - _"What tokens do I hold?"_ with a fixed `PortfolioContext` → assert no MCP tool was called, assert response mentions every symbol in the snapshot.
  - _"Show my Hyperliquid positions"_ → assert `perps_positions` fired exactly once.
  - _"Simulate sending 0.1 SOL"_ → assert `simulate` fired with the right `networkId`.
  - **Write-tool cases (with `writeMode: true`):**
    - _"Transfer 0.001 SOL to 9xY..."_ → assert `transfer` fired exactly once with `confirmed: true`, `networkId: "solana:mainnet"`, no `tokenMint`, and `amount: 0.001`. Assert the assistant's reply contains a `[View on Solscan](https://solscan.io/tx/...)` link.
    - _"Transfer 1 SOL to 9xY..."_ → assert the demo-cap guard rejected the call (tool result `isError: true` with the cap message) and the assistant response acknowledges the limit rather than fabricating success.
    - _"Send 5 USDC on Solana"_ → assert the cap guard rejected on `tokenMint` (SPL token disabled).
    - _"Transfer 0.005 ETH"_ → assert the cap guard rejected on `networkId` (non-Solana network).
  - **Write-mode-off case:** same "Transfer 0.001 SOL" prompt with `writeMode: false` → assert no write tool fired and the response points the user at the Fund button.

- **Multi-model comparison.** `apps/chat-api/src/lib/claude.ts` already accepts `ANTHROPIC_MODEL` via env. Run the eval suite above against `claude-sonnet-4-6`, `claude-haiku-4-5`, and `claude-opus-4-7`; record latency, tool-routing accuracy, and per-prompt cost. Document tradeoffs in this README (e.g. _"Sonnet picks the right tool 95% of the time vs Haiku 70%, at 2.4× the latency and 12× the cost — Sonnet for production, Haiku acceptable for FAQ-style queries"_). This turns "I built on top of an LLM SDK" into "I built on top of an LLM SDK and measured the model behavior I depend on."

- **MCP warm-up on boot.** The first chat request after a chat-api boot still pays a ~1–2s cold start while MCP spawns and validates the cached session against Phantom KMS. Move the `getMcpClient()` call into a top-level await on server boot so the warm-up cost moves out of the critical path. Trade-off: server boot is slightly slower, but P50 first-message latency drops to a clean stream.

- **Per-tool timeouts and retries.** `TOOL_CALL_TIMEOUT_MS = 30_000` is global; some MCP tools (e.g. `simulate_transaction` against a slow RPC) legitimately take longer than `get_wallet_addresses`. A per-tool timeout map plus 1× retry on transient errors would make the agent feel more reliable without inflating the global ceiling.
