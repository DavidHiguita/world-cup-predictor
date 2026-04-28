import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { getSafeRedirectPath } from "@/lib/http/redirects";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { ACCOUNT_DELETION_PENDING_NOTICE } from "@/lib/profile/account-deletion";

type SignInPageProps = {
  searchParams?: Promise<{
    lang?: string;
    error?: string;
    authNotice?: string;
    detail?: string;
    redirectTo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);
  const redirectTo = getSafeRedirectPath(params?.redirectTo, DEFAULT_AUTHENTICATED_REDIRECT);
  const errorMessage =
    params?.error === "credentials"
      ? locale === "es"
        ? "Ingresa correo y contraseña para continuar."
        : "Enter both email and password to continue."
      : params?.error === "signin"
        ? locale === "es"
          ? "No pudimos iniciar sesión con ese correo y contraseña."
          : "We could not sign you in with that email and password."
        : params?.error === "signup"
          ? locale === "es"
            ? "No pudimos crear la cuenta. Revisa el correo o intenta con otra contraseña."
            : "We could not create the account. Check the email or try a different password."
          : params?.error === "google"
            ? locale === "es"
              ? "No pudimos entrar con Google. Revisa la configuración o intenta de nuevo."
              : "We could not sign you in with Google. Check the setup or try again."
            : params?.error === ACCOUNT_DELETION_PENDING_NOTICE
              ? locale === "es"
                ? "Esta cuenta tiene una eliminación pendiente y ya no puede acceder a la aplicación."
                : "This account has a pending deletion request and can no longer access the application."
            : null;
  const noticeMessage =
    params?.authNotice === "check-email"
      ? locale === "es"
        ? "Revisa tu correo para completar la creación de la cuenta."
        : "Check your email to complete account creation."
      : params?.authNotice === ACCOUNT_DELETION_PENDING_NOTICE
        ? locale === "es"
          ? "La cuenta fue marcada para eliminación, se excluyó de futuras comunicaciones y permanecerá en retención durante un mes."
          : "The account has been marked for deletion, excluded from future marketing, and will remain in retention for one month."
        : null;

  return (
    <PublicShell locale={locale}>
      <section className="page-grid">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
            <p className="section-label">{messages.auth.compareTitle}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {messages.auth.title}
            </h2>
            <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
              {messages.auth.description}
            </p>

            <div className="mt-8 grid gap-4">
              <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{messages.auth.providers[0]?.name}</h3>
                    <p className="muted-copy mt-2 text-sm leading-7 sm:text-base">
                      {messages.auth.providers[0]?.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                    {messages.auth.providers[0]?.status}
                  </span>
                </div>
                <div className="mt-5">
                  <Link
                    className="inline-flex rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                    href={`/auth/google?lang=${locale}&redirectTo=${encodeURIComponent(redirectTo)}`}
                  >
                    {locale === "es" ? "Continuar con Google" : "Continue with Google"}
                  </Link>
                </div>
              </article>

              <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{messages.auth.providers[1]?.name}</h3>
                    <p className="muted-copy mt-2 text-sm leading-7 sm:text-base">
                      {messages.auth.providers[1]?.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                    {messages.auth.providers[1]?.status}
                  </span>
                </div>

                <form action="/auth/email" className="mt-5 grid gap-4" method="post">
                  <input name="lang" type="hidden" value={locale} />
                  <input name="redirectTo" type="hidden" value={redirectTo} />

                  <label className="grid gap-2 text-sm font-medium text-white">
                    <span>{locale === "es" ? "Correo electrónico" : "Email"}</span>
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
                      name="email"
                      placeholder={locale === "es" ? "tu@correo.com" : "you@example.com"}
                      required
                      type="email"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-white">
                    <span>{locale === "es" ? "Contraseña" : "Password"}</span>
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
                      minLength={6}
                      name="password"
                      placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Minimum 6 characters"}
                      required
                      type="password"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                      name="mode"
                      type="submit"
                      value="sign-in"
                    >
                      {locale === "es" ? "Iniciar sesión" : "Sign in"}
                    </button>
                    <button
                      className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                      name="mode"
                      type="submit"
                      value="sign-up"
                    >
                      {locale === "es" ? "Crear cuenta" : "Create account"}
                    </button>
                  </div>
                </form>
              </article>
            </div>
          </div>

          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-2xl font-semibold tracking-tight text-white">Invite continuity</h3>
            <p className="muted-copy mt-4 text-base leading-8">
              {messages.auth.inviteHint}
            </p>
            {errorMessage ? (
              <div className="mt-6 rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 p-5 text-sm leading-7 text-rose-100">
                <p>{errorMessage}</p>
                {params?.detail ? <p className="mt-2 text-rose-200/90">{params.detail}</p> : null}
              </div>
            ) : null}
            {noticeMessage ? (
              <div className="mt-6 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
                <p>{noticeMessage}</p>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                href={`/?lang=${locale}`}
              >
                {messages.nav.landing}
              </Link>
              <Link
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/40 hover:bg-white/5"
                href={`/join-group?lang=${locale}`}
              >
                {locale === "es" ? "Unirse con group_id" : "Join with group_id"}
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
