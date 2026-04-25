import { useRef, useState, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  onAbort,
  isStreaming,
  placeholder,
}: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function send() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    taRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2"
    >
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask about your portfolio…"}
        disabled={isStreaming}
        rows={1}
        className="max-h-32 min-h-9 resize-none text-sm"
      />
      {isStreaming ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onAbort}
          aria-label="Stop"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
