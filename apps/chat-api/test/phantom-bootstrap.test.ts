import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapPhantomSession } from "../src/lib/phantom-bootstrap";

// Each test runs against a fresh temp HOME so phantom-bootstrap's runtime
// homedir() lookup points at a clean directory, avoiding cross-test bleed.
let originalHome: string | undefined;
let tempHome: string;

beforeEach(() => {
  originalHome = process.env.HOME;
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "phantom-bootstrap-test-"));
  process.env.HOME = tempHome;
});

afterEach(() => {
  fs.rmSync(tempHome, { recursive: true, force: true });
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  delete process.env.PHANTOM_SESSION_JSON_B64;
  delete process.env.PHANTOM_AUTH2_STAMPER_JSON_B64;
  delete process.env.PHANTOM_AGENT_REGISTRATION_JSON_B64;
});

const sessionJson = JSON.stringify({ walletId: "test-wallet" });
const stamperJson = JSON.stringify({ refreshToken: "test-refresh" });
const registrationJson = JSON.stringify({ client_id: "test-client" });

const setAllEnvVars = () => {
  process.env.PHANTOM_SESSION_JSON_B64 =
    Buffer.from(sessionJson).toString("base64");
  process.env.PHANTOM_AUTH2_STAMPER_JSON_B64 =
    Buffer.from(stamperJson).toString("base64");
  process.env.PHANTOM_AGENT_REGISTRATION_JSON_B64 =
    Buffer.from(registrationJson).toString("base64");
};

describe("bootstrapPhantomSession — env var presence", () => {
  it("is a no-op when no env vars are set", () => {
    bootstrapPhantomSession();
    expect(fs.existsSync(path.join(tempHome, ".phantom-mcp"))).toBe(false);
  });

  it("is a no-op when only some env vars are set (all-or-nothing)", () => {
    process.env.PHANTOM_SESSION_JSON_B64 =
      Buffer.from(sessionJson).toString("base64");
    bootstrapPhantomSession();
    expect(fs.existsSync(path.join(tempHome, ".phantom-mcp"))).toBe(false);
  });
});

describe("bootstrapPhantomSession — write semantics", () => {
  beforeEach(setAllEnvVars);

  it("writes all three files when the dir is empty", () => {
    bootstrapPhantomSession();
    const dir = path.join(tempHome, ".phantom-mcp");
    expect(fs.readFileSync(path.join(dir, "session.json"), "utf8")).toBe(
      sessionJson,
    );
    expect(fs.readFileSync(path.join(dir, "auth2-stamper.json"), "utf8")).toBe(
      stamperJson,
    );
    expect(
      fs.readFileSync(path.join(dir, "agent-registration.json"), "utf8"),
    ).toBe(registrationJson);
  });

  it("creates the dir with mode 0700 (only owner can read)", () => {
    bootstrapPhantomSession();
    const mode = fs.statSync(path.join(tempHome, ".phantom-mcp")).mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it("creates files with mode 0600 (only owner can read)", () => {
    bootstrapPhantomSession();
    const dir = path.join(tempHome, ".phantom-mcp");
    for (const name of [
      "session.json",
      "auth2-stamper.json",
      "agent-registration.json",
    ]) {
      const mode = fs.statSync(path.join(dir, name)).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  it("never overwrites an existing file (preserves rotated tokens)", () => {
    const dir = path.join(tempHome, ".phantom-mcp");
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      path.join(dir, "auth2-stamper.json"),
      "rotated-by-running-mcp",
      { mode: 0o600 },
    );

    bootstrapPhantomSession();

    expect(fs.readFileSync(path.join(dir, "auth2-stamper.json"), "utf8")).toBe(
      "rotated-by-running-mcp",
    );
    // The other two files weren't there before; they should now exist.
    expect(fs.existsSync(path.join(dir, "session.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "agent-registration.json"))).toBe(
      true,
    );
  });
});
