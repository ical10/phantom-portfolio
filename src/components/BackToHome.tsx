import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackToHome() {
  return (
    <Link
      to="/"
      className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to home
    </Link>
  );
}
