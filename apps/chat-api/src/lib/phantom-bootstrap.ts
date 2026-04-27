import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DIR = path.join(os.homedir(), ".phantom-mcp");
const SESSION_FILE = path.join(DIR, "session.json");
const STAMPER_FILE = path.join(DIR, "auth2-stamper.json");

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
  if (!sessionB64 || !stamperB64) return;

  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(SESSION_FILE, Buffer.from(sessionB64, "base64"), {
      mode: 0o600,
    });
  }
  if (!fs.existsSync(STAMPER_FILE)) {
    fs.writeFileSync(STAMPER_FILE, Buffer.from(stamperB64, "base64"), {
      mode: 0o600,
    });
  }
}
