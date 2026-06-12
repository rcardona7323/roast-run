import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function CheckinPage() {
  const checkIn = trpc.checkins.checkIn.useMutation();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    checkIn
      .mutateAsync()
      .then(() => setStatus("done"))
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Check-in failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        {status === "working" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26 }}>Checking you in…</h1>
          </>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, marginBottom: 8 }}>
              You're checked in!
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28 }}>
              Have a great run. When you're done, log your miles for today.
            </p>
            <Link href="/">
              <button className="btn btn-primary" style={{ fontSize: 16, padding: "13px 28px" }}>
                Go Log My Miles
              </button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏰</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, marginBottom: 8 }}>
              Check-in not available
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28 }}>{message}</p>
            <Link href="/">
              <button className="btn btn-outline" style={{ fontSize: 15, padding: "12px 24px" }}>
                Back to Dashboard
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
