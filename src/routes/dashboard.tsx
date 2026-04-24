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

  return (
    <>
      {/* Atmospheric backdrop — fixed so it persists as tables scroll */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--muted-foreground) 28%, transparent) 1.2px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 55% 45% at 50% 30%, transparent 0%, black 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 55% 45% at 50% 30%, transparent 0%, black 85%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-48 left-1/2 h-120 w-170 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        style={{ animation: "orb-float-1 26s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-[-12%] top-[35%] h-90 w-90 rounded-full bg-chart-2/15 blur-3xl"
        style={{ animation: "orb-float-2 22s ease-in-out infinite" }}
      />

      <div className="relative">
        {address ? (
          <WatcherDashboard address={address} />
        ) : (
          <ConnectedDashboard />
        )}
      </div>
    </>
  );
}
