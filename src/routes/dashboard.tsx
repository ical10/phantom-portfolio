import { createFileRoute } from "@tanstack/react-router";
import { ConnectedDashboard } from "@/components/ConnectedDashboard";
import { WatcherDashboard } from "@/components/WatcherDashboard";

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

  if (address) return <WatcherDashboard address={address} />;
  return <ConnectedDashboard />;
}
