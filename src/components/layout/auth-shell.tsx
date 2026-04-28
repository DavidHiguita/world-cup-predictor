"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AuthShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", matches: ["/dashboard"] },
  { href: "/groups", label: "Groups", matches: ["/groups"] },
  { href: "/create-group", label: "Create Group", matches: ["/create-group"] },
  { href: "/profile", label: "Profile", matches: ["/profile"] },
];

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-3xl p-5 sm:p-6">
          <p className="section-label">Application</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Tournament hub</h2>
          <p className="muted-copy mt-3 text-sm leading-6">
            Move between your dashboard, groups, group creation, and account settings from one place.
          </p>
          <nav className="mt-6 grid gap-3">
            {navItems.map((item) => {
              const isActive = item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));

              return (
                <Link
                  key={item.href}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isActive ? "border-sky-400/40 bg-sky-400/10 text-white" : "border-white/10 text-slate-200 hover:border-emerald-400/40 hover:bg-white/5 hover:text-white"}`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Utilities</p>
            <form action="/auth/sign-out" method="post">
              <button
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-sky-400/40 hover:bg-white/5 hover:text-white"
                type="submit"
              >
                Log out
              </button>
            </form>
            <Link
              className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15"
              href="/profile?delete=confirm"
            >
              Delete account
            </Link>
          </div>
        </aside>
        <main className="glass-panel rounded-3xl p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
