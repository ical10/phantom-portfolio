import { AlertCircle } from "lucide-react";

type Props = {
  source: string;
};

export function PriceErrorBanner({ source }: Props) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        Failed to load {source} token prices. Showing balances without USD
        values.
      </p>
    </div>
  );
}
