import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DIR = path.join(os.homedir(), ".phantom-mcp");

// Materialize cached MCP credentials from env vars when the on-disk
// cache is empty. See DEPLOY.md.
export function bootstrapPhantomSession(): void {
  const sources: Record<string, string | undefined> = {
    "session.json": process.env.PHANTOM_SESSION_JSON_B64,
    "auth2-stamper.json": process.env.PHANTOM_AUTH2_STAMPER_JSON_B64,
    "agent-registration.json": process.env.PHANTOM_AGENT_REGISTRATION_JSON_B64,
  };
  if (Object.values(sources).some((v) => !v)) return;

  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  for (const [name, b64] of Object.entries(sources)) {
    const file = path.join(DIR, name);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, Buffer.from(b64 as string, "base64"), {
        mode: 0o600,
      });
    }
  }
}
