import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bootstrapPhantomSession } from "./lib/phantom-bootstrap";
import { rateLimit } from "./middleware/rateLimit";
import { chatRoute } from "./routes/chat";
import { agentWalletRoute } from "./routes/agentWallet";

bootstrapPhantomSession();

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
// /health stays unmetered — platform health probes shouldn't count toward the cap.
app.use("/chat/*", rateLimit);
app.use("/agent-wallet/*", rateLimit);
app.route("/chat", chatRoute);
app.route("/agent-wallet", agentWalletRoute);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[chat-api] listening on :${info.port}`);
});
