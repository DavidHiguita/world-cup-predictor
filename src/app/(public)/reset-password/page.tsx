import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PublicShell } from "@/components/layout/public-shell";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { getSafeRedirectPath } from "@/lib/http/redirects";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    lang?: string;
    redirectTo?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const redirectTo = getSafeRedirectPath(params?.redirectTo, DEFAULT_AUTHENTICATED_REDIRECT);
  const messages = getCommonMessages(locale);
  const continueUrl = new URL(redirectTo, "http://localhost");

  continueUrl.searchParams.set("lang", locale);

  return (
    <PublicShell locale={locale}>
      <section className="page-grid">
        <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="section-label">{messages.auth.compareTitle}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {messages.auth.resetPasswordTitle}
          </h1>
          <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
            {messages.auth.resetPasswordDescription}
          </p>
          <div className="mt-8">
            <ResetPasswordForm
              continueHref={`${continueUrl.pathname}${continueUrl.search}${continueUrl.hash}`}
              copy={messages.auth}
              locale={locale}
              signInHref={`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(redirectTo)}`}
            />
          </div>
        </article>
      </section>
    </PublicShell>
  );
}
