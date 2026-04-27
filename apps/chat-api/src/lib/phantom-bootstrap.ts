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
  if (!sessionB64 || !stamperB64) {
    console.log(
      `[mcp-bootstrap] env vars unset (session=${!!sessionB64}, stamper=${!!stamperB64}); skipping. dir=${DIR}`,
    );
    return;
  }

  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const wrote: string[] = [];
  const skipped: string[] = [];

  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(SESSION_FILE, Buffer.from(sessionB64, "base64"), {
      mode: 0o600,
    });
    wrote.push("session.json");
  } else {
    skipped.push("session.json");
  }

  if (!fs.existsSync(STAMPER_FILE)) {
    fs.writeFileSync(STAMPER_FILE, Buffer.from(stamperB64, "base64"), {
      mode: 0o600,
    });
    wrote.push("auth2-stamper.json");
  } else {
    skipped.push("auth2-stamper.json");
  }

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
}
