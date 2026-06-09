import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Coffee, ArrowRight, Footprints, MapPin, Gift, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const RETURNING_KEY = "rr_visited";

function SigningInScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Coffee className="w-8 h-8 text-primary" />
        <span className="font-bold font-serif text-2xl tracking-tight">Roast &amp; Run</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Signing you in…</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [autoLoginFired, setAutoLoginFired] = useState(false);

  const isReturning = typeof window !== "undefined" && localStorage.getItem(RETURNING_KEY) === "1";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isReturning && !autoLoginFired) {
      setAutoLoginFired(true);
      setSigningIn(true);
      setTimeout(() => {
        localStorage.setItem(RETURNING_KEY, "1");
        login();
      }, 600);
    }
    if (!isLoading && isAuthenticated) {
      localStorage.setItem(RETURNING_KEY, "1");
    }
  }, [isLoading, isAuthenticated, isReturning, autoLoginFired, login]);

  const handleLogin = () => {
    localStorage.setItem(RETURNING_KEY, "1");
    setSigningIn(true);
    setTimeout(() => login(), 400);
  };

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  if (signingIn || (isReturning && !isLoading && !isAuthenticated)) {
    return <SigningInScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-6 h-6 text-primary" />
            <span className="font-bold font-serif text-xl tracking-tight">Roast &amp; Run</span>
          </div>
          <Button onClick={handleLogin} variant="secondary" className="font-medium rounded-full px-6">
            Member Log In
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-32 overflow-hidden flex items-center justify-center min-h-[70vh]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none opacity-40">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 -right-24 w-[30rem] h-[30rem] bg-secondary/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Footprints className="w-4 h-4" />
              <span>Join our local run club</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-serif text-foreground leading-tight tracking-tight mb-6">
              Run local miles. <br />
              <span className="text-primary italic">Earn local coffee.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              We believe great runs end with great coffee. Log your miles, join the neighborhood leaderboard, and unlock free rewards from your favorite local café.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleLogin} size="lg" className="rounded-full px-8 text-base h-14 hover:scale-105 transition-transform">
                Join the Club <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-card py-20 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-serif mb-4">How it works</h2>
              <p className="text-muted-foreground">It's simple: sweat for your espresso.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Log Your Miles</h3>
                <p className="text-muted-foreground">
                  Go for a run, jog, or brisk walk. Come back to the app and log your distance. No GPS tracking required—we trust our community.
                </p>
              </div>

              <div className="bg-background rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-secondary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-secondary">
                  <Trophy className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Climb the Ranks</h3>
                <p className="text-muted-foreground">
                  See how you stack up against other locals on the weekly leaderboard. Friendly neighborhood competition fuels the fire.
                </p>
              </div>

              <div className="bg-background rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-accent w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-accent-foreground">
                  <Gift className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Claim Rewards</h3>
                <p className="text-muted-foreground">
                  Hit milestones and unlock free drip coffee, lattes, smoothies, and exclusive run club apparel straight from the café.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center px-4">
          <h2 className="text-4xl font-bold font-serif mb-6">Ready to hit the pavement?</h2>
          <p className="text-muted-foreground mb-8">Create a free account and start logging miles today.</p>
          <Button onClick={handleLogin} size="lg" className="rounded-full px-10 h-14 text-lg">
            Start Running
          </Button>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border">
        &copy; {new Date().getFullYear()} Roast &amp; Run Club. Powered by local caffeine.
      </footer>
    </div>
  );
}
