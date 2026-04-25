import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

type Props = {
  onClose: () => void;
};

export function InactivePrompt({ onClose }: Props) {
  return (
    <div className="flex w-72 flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Portfolio chat
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The chat is tied to a portfolio. Connect your wallet or paste any
        address on the home page to open a dashboard, then reopen this chat.
      </p>
      <Link
        to="/"
        onClick={onClose}
        className="inline-flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <span>Go to home</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
