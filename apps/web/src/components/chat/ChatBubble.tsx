import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatAddresses } from "@/hooks/useChatAddresses";
import { ChatPanel } from "./ChatPanel";
import { InactivePrompt } from "./InactivePrompt";

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { solanaAddress, evmAddress } = useChatAddresses();

  // ChatBubble should only be in active mode in portfolio page.
  // Otherwise, prompts users to go to landing page
  // and connect their wallet or paste an address
  const isActive = location.pathname === "/dashboard";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            isActive ? "Open portfolio chat" : "Portfolio chat (inactive)"
          }
          className={
            isActive
              ? "group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/50"
              : "group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border transition-all hover:scale-105 hover:text-foreground"
          }
        >
          <Sparkles
            className={isActive ? "h-6 w-6" : "h-6 w-6 opacity-70"}
            strokeWidth={2.25}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-auto border-border bg-card p-0 shadow-2xl"
      >
        {isActive ? (
          <ChatPanel
            open={open}
            solanaAddress={solanaAddress}
            evmAddress={evmAddress}
          />
        ) : (
          <InactivePrompt onClose={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  );
}

