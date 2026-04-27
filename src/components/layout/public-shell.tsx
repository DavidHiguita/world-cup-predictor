import Link from "next/link";

import { type Locale, getCommonMessages } from "@/lib/i18n";

type PublicShellProps = {
  children: React.ReactNode;
  locale: Locale;
};

export function PublicShell({ children, locale }: PublicShellProps) {
  const messages = getCommonMessages(locale);
  const alternateLocale = locale === "en" ? "es" : "en";

  return (
    <div className="app-shell flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="glass-panel rounded-3xl px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">{messages.nav.experience}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {messages.brand}
            </h1>
            <p className="muted-copy mt-2 text-sm">{messages.tagline}</p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm text-slate-300">
            <Link className="rounded-full border border-white/10 px-4 py-2 hover:border-sky-400/40 hover:text-white" href={`/?lang=${locale}`}>
              {messages.nav.landing}
            </Link>
            <Link className="rounded-full border border-white/10 px-4 py-2 hover:border-sky-400/40 hover:text-white" href={`/sign-in?lang=${locale}`}>
              {messages.nav.signIn}
            </Link>
            <Link className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white hover:border-emerald-300/40" href={`?lang=${alternateLocale}`}>
              {messages.nav.language}: {alternateLocale.toUpperCase()}
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col py-6">{children}</main>
    </div>
  );
}
