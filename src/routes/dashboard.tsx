import { createFileRoute } from "@tanstack/react-router";

type DashboardSearch = {
  address?: string;
};

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    address: typeof search.address === "string" ? search.address : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { address } = Route.useSearch();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="text-zinc-500">
        Dashboard {address ? `for ${address}` : "(connected wallet)"}
      </div>
    </main>
  );
}
