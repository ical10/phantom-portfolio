import { spawn } from "node:child_process";

/**
 * One-shot diagnostic: spawn the Phantom MCP CLI directly and capture
 * stdout/stderr/exit-code for ~5 seconds. Bypasses @modelcontextprotocol's
 * StdioClientTransport so there's no race window for stderr listener
 * attachment — every byte the MCP child writes reaches our logs.
 *
 * Call once at boot. Remove this file once MCP is stable on the host.
 */
export async function diagnoseMcpSpawn(): Promise<void> {
  return new Promise((resolve) => {
    console.log("[mcp-diag] spawning: npx -y @phantom/mcp-server@latest");
    const child = spawn("npx", ["-y", "@phantom/mcp-server@latest"], {
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

    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        console.log("[mcp-diag] 5s timeout — killing child (it was still alive)");
        child.kill("SIGKILL");
      }
    }, 5000).unref();
  });
}
