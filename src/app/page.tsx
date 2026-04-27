import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";

type HomePageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);

  return (
    <PublicShell locale={locale}>
      <section className="page-grid">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
            <p className="section-label">{messages.landing.eyebrow}</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {messages.landing.title}
            </h2>
            <p className="muted-copy mt-4 max-w-3xl text-base leading-8 sm:text-lg">
              {messages.landing.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                href={`/sign-in?lang=${locale}`}
              >
                {messages.landing.primaryCta}
              </Link>
              <Link
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/40 hover:bg-white/5"
                href={`/dashboard?lang=${locale}`}
              >
                {messages.landing.secondaryCta}
              </Link>
            </div>
          </div>

          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {messages.landing.heroCardTitle}
            </p>
            <div className="mt-4 grid gap-3">
              {messages.landing.heroCardItems.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-100 sm:text-base">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              {messages.landing.valueTitle}
            </h3>
            <p className="muted-copy mt-4 text-base leading-8">
              {messages.landing.valueDescription}
            </p>
            <ul className="muted-copy mt-6 grid gap-3 text-sm leading-7 sm:text-base">
              {messages.landing.valuePoints.map((point) => (
                <li key={point} className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100">
                  {point}
                </li>
              ))}
            </ul>
          </article>

          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              {messages.landing.howItWorksTitle}
            </h3>
            <div className="mt-6 grid gap-4">
              {messages.landing.howItWorksSteps.map((step, index) => (
                <div key={step.title} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400 font-semibold text-slate-950">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                      <p className="muted-copy mt-2 text-sm leading-7 sm:text-base">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <h3 className="text-2xl font-semibold tracking-tight text-white">
            {messages.landing.featureGridTitle}
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {messages.landing.featureGridItems.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PublicShell>
  );
}
