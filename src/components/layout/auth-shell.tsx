import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/create-group", label: "Create Group" },
  { href: "/join-group", label: "Join Group" },
  { href: "/profile", label: "Profile" },
];

const utilityItems = [{ href: "/auth/sign-out", label: "Log out" }];

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-3xl p-5 sm:p-6">
          <p className="section-label">Application</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Tournament hub</h2>
          <p className="muted-copy mt-3 text-sm leading-6">
            Move between your dashboard, groups, rankings, and account settings from one place.
          </p>
          <nav className="mt-6 grid gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-white/5 hover:text-white"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Utilities</p>
            {utilityItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-400/40 hover:bg-white/5 hover:text-white"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
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
