import { Link, useLocation } from "wouter";
import { signOut } from "../lib/auth";
import { cn } from "../lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/runs", label: "Runs" },
  { href: "/rewards", label: "Rewards" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">🏃 Run Club</span>
          <div className="flex gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                <span
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    location === l.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {l.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
