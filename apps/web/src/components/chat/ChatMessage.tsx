import { AlertTriangle, Wrench } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@portfolio/shared";

type Props = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-foreground">
          {message.content || (
            <span className="text-muted-foreground italic">…</span>
          )}
        </div>
      </div>
    );
  }

  if (message.role === "tool-call") {
    return (
      <div className="flex items-center gap-2 self-start text-xs text-muted-foreground">
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-mono">{message.name}</span>
        <span className="opacity-60">running…</span>
      </div>
    );
  }

  // tool-result
  return (
    <details className="group self-start">
      <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        {message.isError ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
        ) : (
          <Wrench className="h-3 w-3 shrink-0" />
        )}
        <span className="font-mono">{message.name}</span>
        <span className={message.isError ? "text-destructive" : "opacity-60"}>
          {message.isError ? "errored" : "returned"}
        </span>
        <span className="ml-1 text-[10px] opacity-40 group-open:hidden">
          show
        </span>
        <span className="ml-1 text-[10px] opacity-40 group-open:inline hidden">
          hide
        </span>
      </summary>
      <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card p-2 text-[11px] leading-relaxed">
        {safeStringify(message.output)}
      </pre>
    </details>
  );
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
