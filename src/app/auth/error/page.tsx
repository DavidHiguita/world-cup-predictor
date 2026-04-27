import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="app-shell flex min-h-screen flex-col justify-center px-4 py-6 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
        <p className="section-label">Authentication error</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          We could not complete the sign-in flow
        </h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          Please try again or return to the landing page. Once provider configuration is complete, this route will help users recover gracefully from auth failures.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href="/sign-in">
            Back to sign in
          </Link>
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/40 hover:bg-white/5" href="/">
            Back to landing
          </Link>
        </div>
      </section>
    </main>
  );
}
