export function JupiterAttribution() {
  return (
    <p className="text-center text-[11px] text-muted-foreground">
      Solana token prices powered by{" "}
      <a
        href="https://lite-api.jup.ag/price/v3"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Jupiter API
      </a>
    </p>
  );
}
