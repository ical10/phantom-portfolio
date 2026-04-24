import { useState } from "react";

type Props = {
  src: string | undefined;
  symbol: string;
};

export function TokenLogo({ src, symbol }: Props) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setErrored(true)}
        className="h-8 w-8 shrink-0 rounded-full"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
