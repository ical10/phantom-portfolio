export function CoinGeckoAttribution() {
  return (
    <p className="text-center text-[11px] text-muted-foreground">
      EVM token prices powered by{" "}
      <a
        href="https://www.coingecko.com/en/api?utm_source=phantom-portfolio&utm_medium=referral"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        CoinGecko API
      </a>
    </p>
  );
}
