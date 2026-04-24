import { useCallback, useRef, useState } from "react";
import type {
  ChatMessage,
  PortfolioContext,
  StreamEvent,
} from "@portfolio/shared";

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? "";

type UseChatArgs = {
  // Called once per sendMessage at the moment of send, so the latest
  // dashboard state is captured rather than stale-closured.
  buildPortfolio: () => PortfolioContext;
};

type UseChatResult = {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
  isStreaming: boolean;
  error: string | null;
};

export function useChat({ buildPortfolio }: UseChatArgs): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setMessages([]);
    setError(null);
  }, [abort]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      if (!CHAT_API_URL) {
        setError("VITE_CHAT_API_URL is not set");
        return;
      }

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      // Snapshot the messages array we're about to send (includes the new
      // user msg) BEFORE the state update, so the server call matches
      // what the UI shows.
      const outboundMessages = [...messages, userMsg];
      setMessages(outboundMessages);
      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${CHAT_API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: outboundMessages,
            portfolio: buildPortfolio(),
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
            applyEvent(event, setMessages, setError);
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, buildPortfolio],
  );

  return { messages, sendMessage, abort, reset, isStreaming, error };
}

function applyEvent(
  event: StreamEvent,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  switch (event.type) {
    case "token": {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + event.delta },
          ];
        }
        return [...prev, { role: "assistant", content: event.delta }];
      });
      return;
    }
    case "tool-call-start": {
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
    }
    case "tool-call-result": {
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
      return;
    }
    case "error": {
      setError(event.message);
      return;
    }
    case "done": {
      return;
    }
  }
}
