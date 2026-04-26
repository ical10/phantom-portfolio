import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimit } from "./middleware/rateLimit";
import { chatRoute } from "./routes/chat";
import { agentWalletRoute } from "./routes/agentWallet";

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
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
  console.log(`[chat-api] listening on http://localhost:${info.port}`);
  console.log(`[chat-api] allowed origins: ${allowedOrigins.join(", ")}`);
});
