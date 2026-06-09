import { useState, Component, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Link, useLocation } from "wouter";
import { trpc, createTRPCClient } from "./lib/trpc";
import { useSession } from "./lib/auth";
import Sidebar from "./components/sidebar";
import LandingPage from "./pages/landing";
import DashboardPage from "./pages/dashboard";
import RunsPage from "./pages/runs";
import RewardsPage from "./pages/rewards";
import ProfilePage from "./pages/profile";
import AdminPage from "./pages/admin";
import LeaderboardPage from "./pages/leaderboard";
import AuthPage from "./pages/auth";
import OnboardingPage from "./pages/onboarding";
import JoinPage from "./pages/join";
import NotFoundPage from "./pages/not-found";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="bg-white p-6 rounded-xl border border-red-200 max-w-lg">
            <h2 className="font-bold text-red-700 mb-2">App Error</h2>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">{(this.state.error as Error).message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [orgId, setOrgId] = useState(() => localStorage.getItem("organizationId") ?? "");
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient(orgId));

  function selectOrg(id: string) {
    localStorage.setItem("organizationId", id);
    // Reload from root to reinitialize tRPC client with new orgId
    window.location.href = "/";
  }

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Router orgId={orgId} onSelectOrg={selectOrg} />
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

function Router({ orgId, onSelectOrg }: { orgId: string; onSelectOrg: (id: string) => void }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--primary-tint)", borderTopColor: "var(--primary)", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  // Join pages are always accessible (handle auth state internally)
  const path = window.location.pathname;
  if (path.startsWith("/join/")) {
    const slug = path.replace("/join/", "");
    return (
      <Switch>
        <Route path="/join/:slug">
          {(params) => <JoinPage onSelectOrg={onSelectOrg} />}
        </Route>
      </Switch>
    );
  }

  if (!session) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  if (!orgId) {
    return (
      <Switch>
        <Route path="/join/:slug">
          {() => <JoinPage onSelectOrg={onSelectOrg} />}
        </Route>
        <Route>
          <OnboardingPage onSelectOrg={onSelectOrg} />
        </Route>
      </Switch>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/runs" component={RunsPage} />
          <Route path="/rewards" component={RewardsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/join/:slug">
            {() => <JoinPage onSelectOrg={onSelectOrg} />}
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
      </main>
      <MobileNav />
    </div>
  );
}

function MobileNav() {
  const [location] = useLocation();
  const { data: member } = trpc.members.me.useQuery();

  const items = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/runs", label: "Runs", icon: <RunIcon /> },
    { href: "/rewards", label: "Rewards", icon: <RewardIcon /> },
    { href: "/leaderboard", label: "Leaders", icon: <LeaderIcon /> },
    { href: "/profile", label: "Profile", icon: <ProfileIcon /> },
  ];

  // Add admin tab if member is admin
  if (member?.isAdmin) {
    items.push({ href: "/admin", label: "Admin", icon: <AdminIcon /> });
  }

  return (
    <nav className="mobile-nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href}
          className={`mobile-nav-item${location === item.href ? " active" : ""}`}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function RunIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="M9 20l3-8 2.5 2.5L17 8"/><path d="M6.5 17.5L9 20"/></svg>; }
function RewardIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>; }
function LeaderIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function ProfileIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function AdminIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
