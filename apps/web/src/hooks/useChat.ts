import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  PortfolioContext,
  StreamEvent,
} from "@portfolio/shared";

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? "";
const STORAGE_PREFIX = "phantom-portfolio:chat:";

// Hydrate persisted history at mount. Returns [] for SSR / no-key /
// invalid blobs; we don't try to reconcile partial saves.
function loadStoredMessages(key: string | null): ChatMessage[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

type UseChatArgs = {
  // Called once per sendMessage at the moment of send, so the latest
  // dashboard state is captured rather than stale-closured.
  buildPortfolio: () => PortfolioContext;
  // Read at send time so the chat picks up funding state
  // changes mid-conversation without re-creating sendMessage.
  getWriteMode: () => boolean;
  // Stable per-context key (e.g. connected wallet address). Used to
  // namespace persisted history so wallet A's chat doesn't leak into
  // wallet B's. Pass null to disable persistence (e.g. watcher mode).
  storageKey: string | null;
  // Optional hook fired when a tool-result event lands. Used by the
  // host to invalidate caches that the tool may have mutated (e.g.
  // refetch the agent wallet balance after a successful `transfer`).
  onToolResult?: (event: {
    name: string;
    output: unknown;
    isError: boolean;
  }) => void;
};

type UseChatResult = {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
  isStreaming: boolean;
  error: string | null;
};

export function useChat({
  buildPortfolio,
  getWriteMode,
  storageKey,
  onToolResult,
}: UseChatArgs): UseChatResult {
  // Mirror the callback into a ref so we can read the latest closure
  // inside sendMessage without making sendMessage depend on it.
  const onToolResultRef = useRef(onToolResult);
  onToolResultRef.current = onToolResult;
  // Hydrate from localStorage on first mount, then re-hydrate when the
  // storage key changes (wallet swap). When key is null we just clear.
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadStoredMessages(storageKey),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Mirror messages into a ref so sendMessage can read the latest list
  // without depending on `messages` (which would re-create sendMessage on
  // every token append and churn consumers like EmptyState's onPick).
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  // Persist on every messages change. Skipped on the initial mount when
  // we just hydrated — but writing the same blob back is harmless, so we
  // don't bother short-circuiting it. While streaming we'd thrash storage
  // on every token; the typewriter buffer in sendMessage already coarsens
  // updates to ~60Hz, but we still skip persistence mid-stream and flush
  // once the stream ends.
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    if (isStreaming) return;
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + storageKey,
        JSON.stringify(messages),
      );
    } catch {
      // localStorage can throw on quota / privacy mode — best effort.
    }
  }, [messages, storageKey, isStreaming]);

  // On wallet swap, swap in the new wallet's history.
  const lastKeyRef = useRef(storageKey);
  useEffect(() => {
    if (storageKey === lastKeyRef.current) return;
    lastKeyRef.current = storageKey;
    setMessages(loadStoredMessages(storageKey));
    setError(null);
  }, [storageKey]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setMessages([]);
    setError(null);
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + storageKey);
      } catch {
        // ignore
      }
    }
  }, [abort, storageKey]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || abortRef.current) return;

      if (!CHAT_API_URL) {
        setError("VITE_CHAT_API_URL is not set");
        return;
      }

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      // Snapshot the messages array we're about to send (includes the new
      // user msg) BEFORE the state update, so the server call matches
      // what the UI shows.
      const outboundMessages = [...messagesRef.current, userMsg];
      setMessages(outboundMessages);
      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      // Smooth-stream buffer: token deltas from Anthropic arrive at variable
      // rates and chunk sizes. We accumulate them into `pending` and drain
      // a fixed number of chars per animation frame, which gives a uniform
      // typewriter cadence regardless of upstream jitter. Same idea as
      // Vercel AI SDK's `smoothStream` transform, hand-rolled.
      const CHARS_PER_FRAME = 5; // ~300 chars/sec at 60fps
      let pending = "";
      let rafId: number | null = null;

      const appendToLastAssistant = (text: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + text },
            ];
          }
          return [...prev, { role: "assistant", content: text }];
        });
      };

      const tick = () => {
        rafId = null;
        if (!pending) return;
        const chunk = pending.slice(0, CHARS_PER_FRAME);
        pending = pending.slice(chunk.length);
        appendToLastAssistant(chunk);
        if (pending) rafId = requestAnimationFrame(tick);
      };

      const enqueueText = (text: string) => {
        pending += text;
        if (rafId === null) rafId = requestAnimationFrame(tick);
      };

      // Force-flush remaining buffer (e.g. before a tool-call event or at
      // stream end), so message ordering matches wire order and the user
      // sees the final text before `isStreaming` flips off.
      const drainPending = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (pending) {
          appendToLastAssistant(pending);
          pending = "";
        }
      };

      const handleEvent = (event: StreamEvent) => {
        if (event.type !== "token") drainPending();
        switch (event.type) {
          case "token":
            enqueueText(event.delta);
            return;
          case "tool-call-start":
            setMessages((prev) => [
              ...prev,
              {
                role: "tool-call",
                id: event.id,
                name: event.name,
                input: event.input,
              },
            ]);
            return;
          case "tool-call-result":
            setMessages((prev) => [
              ...prev,
              {
                role: "tool-result",
                id: event.id,
                name: event.name,
                output: event.output,
                isError: event.isError,
              },
            ]);
            onToolResultRef.current?.({
              name: event.name,
              output: event.output,
              isError: event.isError,
            });
            return;
          case "error":
            setError(event.message);
            return;
          case "done":
            return;
        }
      };

      try {
        const res = await fetch(`${CHAT_API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: outboundMessages,
            portfolio: buildPortfolio(),
            writeMode: getWriteMode(),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            retryAfterSeconds?: number;
          };
          if (res.status === 429) {
            throw new Error(
              `Rate limit hit. Try again in ${body.retryAfterSeconds ?? "a few"} seconds.`,
            );
          }
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        if (!res.body) throw new Error("Empty response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frame delimiter is a blank line. Split and keep any tail.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const dataLine = frame
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const event = JSON.parse(dataLine.slice(6)) as StreamEvent;
            handleEvent(event);
          }
        }
        drainPending();
      } catch (e) {
        drainPending();
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (rafId !== null) cancelAnimationFrame(rafId);
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [buildPortfolio, getWriteMode],
  );

  return { messages, sendMessage, abort, reset, isStreaming, error };
}
