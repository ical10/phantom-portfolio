import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DIR = path.join(os.homedir(), ".phantom-mcp");
const SESSION_FILE = path.join(DIR, "session.json");
const STAMPER_FILE = path.join(DIR, "auth2-stamper.json");
const REGISTRATION_FILE = path.join(DIR, "agent-registration.json");

/**
 * Pre-bake Phantom MCP session files from base64 env vars so MCP can boot
 * on a headless host without the device-code OAuth flow. Bootstrap once
 * locally with `npx -y @phantom/cli@latest login`, then base64-encode the
 * resulting `~/.phantom-mcp/{session.json,auth2-stamper.json}` and set
 * them as env vars on the deploy target. See README § Known limitations.
 *
 * Skips writing if the file already exists — the running MCP may have
 * rotated refresh tokens, and clobbering with stale env-var content
 * would invalidate the active session.
 */
export function bootstrapPhantomSession(): void {
  const sessionB64 = process.env.PHANTOM_SESSION_JSON_B64;
  const stamperB64 = process.env.PHANTOM_AUTH2_STAMPER_JSON_B64;
  const registrationB64 = process.env.PHANTOM_AGENT_REGISTRATION_JSON_B64;
  if (!sessionB64 || !stamperB64 || !registrationB64) {
    console.log(
      `[mcp-bootstrap] env vars unset (session=${!!sessionB64}, stamper=${!!stamperB64}, registration=${!!registrationB64}); skipping. dir=${DIR}`,
    );
    return;
  }

  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const wrote: string[] = [];
  const skipped: string[] = [];

  const writeIfAbsent = (file: string, b64: string, name: string) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, Buffer.from(b64, "base64"), { mode: 0o600 });
      wrote.push(name);
    } else {
      skipped.push(name);
    }
  };
  writeIfAbsent(SESSION_FILE, sessionB64, "session.json");
  writeIfAbsent(STAMPER_FILE, stamperB64, "auth2-stamper.json");
  writeIfAbsent(REGISTRATION_FILE, registrationB64, "agent-registration.json");

  // Log file sizes so a malformed/truncated env var (e.g., a copy-paste
  // that lost trailing chars) is detectable in deploy logs.
  const sizes = fs.readdirSync(DIR).map((f) => {
    try {
      return `${f}=${fs.statSync(`${DIR}/${f}`).size}b`;
    } catch {
      return f;
    }
  });
  console.log(
    `[mcp-bootstrap] dir=${DIR} wrote=[${wrote.join(",")}] skipped=[${skipped.join(",")}] files=[${sizes.join(",")}]`,
  );

  // Validate the files parse as JSON. If base64 lost a chunk during
  // copy-paste into the platform, decode succeeds but the result is
  // garbage that fails to parse — and MCP would crash silently on load.
  for (const file of [SESSION_FILE, STAMPER_FILE, REGISTRATION_FILE]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
        string,
        unknown
      >;
      console.log(
        `[mcp-bootstrap] ${path.basename(file)} parses OK; keys=[${Object.keys(parsed).join(",")}]`,
      );
    } catch (e) {
      console.error(
        `[mcp-bootstrap] ${path.basename(file)} JSON parse FAILED:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
}
