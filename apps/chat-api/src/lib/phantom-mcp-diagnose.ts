import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import * as path from "node:path";

const _require = createRequire(import.meta.url);
const PHANTOM_MCP_BIN = path.join(
  path.dirname(_require.resolve("@phantom/mcp-server/package.json")),
  "dist/bin.js",
);

/**
 * One-shot diagnostic: spawn the Phantom MCP server directly (via the
 * pre-installed package, bypassing `npx -y` which adds a slow download
 * step on cold containers) and capture stdout/stderr/exit-code for ~30
 * seconds. Drives the MCP protocol with initialize + tools/list so the
 * SessionManager validation path actually fires.
 *
 * Call once at boot. Remove this file once MCP is stable on the host.
 */
export async function diagnoseMcpSpawn(): Promise<void> {
  return new Promise((resolve) => {
    console.log(`[mcp-diag] spawning: node ${PHANTOM_MCP_BIN}`);
    const child = spawn(process.execPath, [PHANTOM_MCP_BIN], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutAccum = "";
    let stderrAccum = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutAccum.length < 8000) stdoutAccum += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrAccum.length < 16000) stderrAccum += chunk.toString();
    });
    child.on("error", (err) => {
      console.error("[mcp-diag] spawn error:", err);
    });
    child.on("exit", (code, signal) => {
      console.log(
        `[mcp-diag] exit code=${code} signal=${signal} stdoutBytes=${stdoutBytes} stderrBytes=${stderrBytes}`,
      );
      if (stdoutAccum) console.log("[mcp-diag] STDOUT:\n" + stdoutAccum);
      if (stderrAccum) console.log("[mcp-diag] STDERR:\n" + stderrAccum);
      resolve();
    });

    // Drive the MCP protocol: send initialize, then tools/list. If the
    // session validation fails inside MCP's initialize handler, this is
    // when we'll see the error message in stderr.
    setTimeout(() => {
      if (!child.stdin || child.stdin.destroyed) return;
      const init = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "diag", version: "0.0.1" },
        },
      });
      child.stdin.write(init + "\n");
      console.log("[mcp-diag] sent initialize");
    }, 500);

    setTimeout(() => {
      if (!child.stdin || child.stdin.destroyed) return;
      const initialized = JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });
      const list = JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      });
      child.stdin.write(initialized + "\n");
      child.stdin.write(list + "\n");
      console.log("[mcp-diag] sent initialized + tools/list");
    }, 1500);

    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        console.log(
          "[mcp-diag] 30s timeout — killing child (it was still alive)",
        );
        child.kill("SIGKILL");
      }
    }, 30000).unref();
  });
}
