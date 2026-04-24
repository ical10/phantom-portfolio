import { AlertTriangle } from "lucide-react";

type Props = {
  source: string;
};

export function RateLimitBanner({ source }: Props) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        Some {source} prices are temporarily unavailable due to upstream rate
        limiting. Values will refresh on retry.
      </p>
    </div>
  );
}
