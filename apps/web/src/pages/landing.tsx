import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header className="landing-nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 48px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--primary-tint)", display: "grid", placeItems: "center", color: "var(--primary)" }}>
            <CupIcon />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, lineHeight: 1.1 }}>Roast &amp; Run</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Café Club</div>
          </div>
        </div>
        <Link href="/auth">
          <button className="btn btn-outline" style={{ fontSize: 14.5, padding: "10px 20px" }}>Sign In</button>
        </Link>
      </header>

      {/* Hero */}
      <main className="landing-hero" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 999, background: "var(--primary-tint)", color: "var(--primary)", fontSize: 13, fontWeight: 700, marginBottom: 28, letterSpacing: ".02em" }}>
          <RunIcon /> Built for café run clubs
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(42px, 7vw, 72px)", lineHeight: 1.05, letterSpacing: "-.03em", color: "var(--ink)", maxWidth: 760, marginBottom: 22 }}>
          Run more. Earn your<br />
          <span style={{ color: "var(--primary)" }}>morning coffee.</span>
        </h1>

        <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 520, lineHeight: 1.6, marginBottom: 40 }}>
          Log miles, hit milestones, and redeem café rewards. Built for run clubs that start and end with great coffee.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/auth">
            <button className="btn btn-primary" style={{ fontSize: 16, padding: "14px 30px" }}>
              <ShoeIcon /> Get Started Free
            </button>
          </Link>
        </div>

        {/* Stats strip */}
        <div className="landing-stats" style={{ display: "flex", gap: 48, marginTop: 64, padding: "24px 40px", background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          {[
            { value: "Log runs", label: "manually or via Strava" },
            { value: "Earn rewards", label: "at every milestone" },
            { value: "Multi-café", label: "multi-tenant support" },
          ].map((s) => (
            <div key={s.value} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Features */}
      <section className="landing-features-wrap" style={{ padding: "0 48px 80px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div className="landing-features" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            {
              icon: <RunIcon size={28} />,
              title: "Log Every Mile",
              desc: "Manual entry or auto-sync from Strava. Every run counts toward your next reward.",
            },
            {
              icon: <CupIcon size={28} />,
              title: "Earn Café Rewards",
              desc: "Hit distance milestones and redeem perks — coffee, pastries, smoothies, and more.",
            },
            {
              icon: <ChartIcon />,
              title: "Track Your Progress",
              desc: "See your total miles, this week's effort, and how close you are to the next tier.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card"
              style={{ padding: "28px 24px" }}
            >
              <div style={{ color: "var(--primary)", marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--muted-2)" }}>© 2026 Roast &amp; Run · Built for café run clubs</p>
      </footer>
    </div>
  );
}

function CupIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
    </svg>
  );
}

function RunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1"/><path d="M7 21l3-6"/><path d="M17 21l-3-6-3-1 2-5"/><path d="M6 12l2-5 5 1 2 3 4 1"/>
    </svg>
  );
}

function ShoeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 17H3a1 1 0 0 1-1-1v-2a4 4 0 0 1 4-4h1l2-5h1a3 3 0 0 1 3 3v1h1a4 4 0 0 1 4 4v2a1 1 0 0 1-1 1z"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}
