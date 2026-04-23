import type { EvmChainSectionData } from "@/hooks/useEvmPortfolio";
import { TokenTable } from "./TokenTable";

type Props = {
  data: EvmChainSectionData;
};

export function EvmChainSection({ data }: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {data.label}
      </h2>
      <TokenTable tokens={data.rows} />
    </section>
  );
}
