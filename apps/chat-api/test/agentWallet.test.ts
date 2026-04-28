import { describe, expect, it, vi } from "vitest";

// Stub the MCP-touching helper before importing the route module so the
// route's `import { getAgentWalletAddresses } from "../lib/claude"` resolves
// to our mock. vitest hoists vi.mock above imports automatically.
const getAgentWalletAddresses = vi.fn();
vi.mock("../src/lib/claude", () => ({
  getAgentWalletAddresses: () => getAgentWalletAddresses(),
}));

const {
  agentWalletRoute,
  extractWalletAddresses,
} = await import("../src/routes/agentWallet");

describe("extractWalletAddresses — MCP response shape parsing", () => {
  it("extracts JSON from the first text content block", () => {
    const mcp = {
      content: [
        { type: "text", text: '{"walletId":"abc","addresses":[]}' },
      ],
    };
    expect(extractWalletAddresses(mcp)).toEqual({
      walletId: "abc",
      addresses: [],
    });
  });

  it("returns the raw input when content is missing", () => {
    const mcp = { unexpected: "shape" };
    expect(extractWalletAddresses(mcp)).toBe(mcp);
  });

  it("returns the raw input when no text block is present", () => {
    const mcp = { content: [{ type: "image", url: "x" }] };
    expect(extractWalletAddresses(mcp)).toBe(mcp);
  });

  it("returns the raw input when the text block isn't valid JSON", () => {
    const mcp = { content: [{ type: "text", text: "not-json" }] };
    expect(extractWalletAddresses(mcp)).toBe(mcp);
  });

  it("handles undefined input gracefully", () => {
    expect(extractWalletAddresses(undefined)).toBeUndefined();
  });
});

describe("agentWalletRoute — GET /addresses", () => {
  it("returns the parsed wallet payload on success", async () => {
    getAgentWalletAddresses.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            walletId: "337d0ff7",
            organizationId: "c2858af7",
            addresses: [
              {
                addressType: "Solana",
                address: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
              },
            ],
          }),
        },
      ],
    });

    const res = await agentWalletRoute.request("/addresses");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { addresses: Array<{ address: string }> };
    expect(body.addresses[0]?.address).toBe(
      "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
    );
  });

  it("returns 502 + diagnostic body when MCP returns an unexpected shape", async () => {
    getAgentWalletAddresses.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"foo":"bar"}' }],
    });

    const res = await agentWalletRoute.request("/addresses");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; raw: unknown };
    expect(body.error).toBe("unexpected-mcp-response");
    expect(body.raw).toBeTruthy();
  });

  it("returns 500 with the error message when MCP throws", async () => {
    getAgentWalletAddresses.mockRejectedValueOnce(
      new Error("MCP error -32000: Connection closed"),
    );

    const res = await agentWalletRoute.request("/addresses");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Connection closed");
  });

  it("returns 500 with 'Unknown error' when MCP throws a non-Error value", async () => {
    getAgentWalletAddresses.mockRejectedValueOnce("string-error");

    const res = await agentWalletRoute.request("/addresses");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unknown error");
  });
});
