import { WatcherInput } from "@/components/WatcherInput";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col gap-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Smart Portfolio
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            View token balances across Solana, Ethereum, and Polygon. Connect a
            wallet or paste any address to watch.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Connect
          </h2>
          <ConnectButton />
        </section>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800">
            <span className="text-sm text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Watch any address
          </h2>
          <WatcherInput />
        </section>
      </div>
    </main>
  );
}
