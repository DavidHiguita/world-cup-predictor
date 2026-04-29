"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = resolveLocale(searchParams.get("lang"));
  const messages = getCommonMessages(locale);
  const copy = messages.appShell;
  const langQuery = new URLSearchParams({ lang: locale }).toString();

  const navItems = [
    { href: "/dashboard", label: copy.dashboard, matches: ["/dashboard"] },
    { href: "/groups", label: copy.groups, matches: ["/groups"] },
    { href: "/create-group", label: copy.createGroup, matches: ["/create-group"] },
    { href: "/profile", label: copy.profile, matches: ["/profile"] },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-3xl p-5 sm:p-6">
          <p className="section-label">{copy.sectionLabel}</p>
          <h2 className="mt-3 text-xl font-semibold text-white">{copy.title}</h2>
          <p className="muted-copy mt-3 text-sm leading-6">
            {copy.description}
          </p>
          <nav className="mt-6 grid gap-3">
            {navItems.map((item) => {
              const isActive = item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  key={item.href}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isActive ? "border-sky-400/40 bg-sky-400/10 text-white" : "border-white/10 text-slate-200 hover:border-emerald-400/40 hover:bg-white/5 hover:text-white"}`}
                  href={`${item.href}?${langQuery}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.utilitiesTitle}</p>
            <Suspense fallback={null}>
              <LanguageSwitcher className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-white transition hover:border-emerald-300/40 hover:bg-emerald-400/15" />
            </Suspense>
            <form action="/auth/sign-out" method="post">
              <input name="lang" type="hidden" value={locale} />
              <button
                aria-label={copy.logOut}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-sky-400/40 hover:bg-white/5 hover:text-white"
                type="submit"
              >
                {copy.logOut}
              </button>
            </form>
            <Link
              aria-label={copy.deleteAccount}
              className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15"
              href={`/profile?lang=${locale}&delete=confirm`}
            >
              {copy.deleteAccount}
            </Link>
          </div>
        </aside>
        <main className="glass-panel rounded-3xl p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
