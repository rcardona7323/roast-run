import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Coffee, Activity, Trophy, Gift, History, Plus, Settings, LogOut, Menu, ShieldCheck, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const { data: profile } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: !!user,
    }
  });

  const memberLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Activity },
    { href: "/log-run", label: "Log a Run", icon: Plus },
    { href: "/runs", label: "My Runs", icon: History },
    { href: "/rewards", label: "Rewards", icon: Gift },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "My Profile", icon: UserCircle },
  ];

  const adminLinks = profile?.isAdmin
    ? [{ href: "/admin", label: "Admin Panel", icon: Settings }]
    : [];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-1 w-full">
      <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 mb-1">Member</p>
      {memberLinks.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;
        return (
          <Link key={link.href} href={link.href} onClick={onClick}>
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20 translate-y-[-1px]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span>{link.label}</span>
            </div>
          </Link>
        );
      })}
      {adminLinks.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 mt-4 mb-1">Café Admin</p>
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={onClick}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-secondary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{link.label}</span>
                </div>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold font-serif text-xl leading-tight">Roast &amp; Run</h1>
            <p className="text-xs text-muted-foreground">Café Club</p>
          </div>
        </div>

        <nav className="flex-1">
          <NavLinks />
        </nav>

        <div className="pt-6 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-2 mb-4">
            <Avatar>
              <AvatarImage src={profile?.profileImageUrl || undefined} />
              <AvatarFallback>{profile?.displayName?.substring(0, 2).toUpperCase() || "RC"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{profile?.displayName}</p>
                {profile?.isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-secondary/20 text-secondary-foreground px-1.5 py-0.5 rounded-full shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{profile?.totalMiles || 0} miles</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-primary" />
            <h1 className="font-bold font-serif text-lg">Roast &amp; Run</h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 flex flex-col p-6">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold font-serif text-xl leading-tight">Roast &amp; Run</h1>
                </div>
              </div>
              <nav className="flex-1">
                <NavLinks />
              </nav>
              <div className="pt-6 border-t border-border mt-auto">
                <Button variant="outline" className="w-full justify-start" onClick={() => logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
