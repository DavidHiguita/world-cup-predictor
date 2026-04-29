"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { type Locale } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ResetPasswordFormCopy = {
  resetPasswordDescription: string;
  resetPasswordInvalidTitle: string;
  resetPasswordInvalidDescription: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  confirmPasswordHint: string;
  updatePasswordAction: string;
  updatingPasswordAction: string;
  passwordMismatchError: string;
  passwordUpdatedNotice: string;
  continueAction: string;
  backToSignInAction: string;
};

type ResetPasswordFormProps = {
  locale: Locale;
  copy: ResetPasswordFormCopy;
  continueHref: string;
  signInHref: string;
};

export function ResetPasswordForm({ locale, copy, continueHref, signInHref }: ResetPasswordFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsChecking(true);
      setError(null);

      const currentUrl = new URL(window.location.href);
      const authError = currentUrl.searchParams.get("error");
      const code = currentUrl.searchParams.get("code");

      if (authError) {
        if (!cancelled) {
          setIsReady(false);
          setIsChecking(false);
        }
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (!cancelled) {
            setError(exchangeError.message);
            setIsReady(false);
            setIsChecking(false);
          }
          return;
        }

        currentUrl.searchParams.delete("code");
        currentUrl.searchParams.delete("type");
        currentUrl.searchParams.delete("error");
        currentUrl.searchParams.delete("error_description");
        window.history.replaceState({}, "", currentUrl.toString());
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      setIsReady(Boolean(session));
      setIsChecking(false);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUpdating) {
      return;
    }

    if (password.length < 6 || confirmPassword.length < 6 || password !== confirmPassword) {
      setError(copy.passwordMismatchError);
      return;
    }

    setIsUpdating(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsUpdating(false);
      return;
    }

    setIsUpdated(true);
    setIsReady(false);
    setIsUpdating(false);
    setPassword("");
    setConfirmPassword("");
  }

  if (isChecking) {
    return (
      <div aria-busy="true" className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5" role="status">
        <p className="muted-copy text-sm leading-7 sm:text-base">{copy.resetPasswordDescription}</p>
      </div>
    );
  }

  if (isUpdated) {
    return (
      <div className="grid gap-4">
        <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-50" role="status" aria-live="polite">
          {copy.passwordUpdatedNotice}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={continueHref}>
            {copy.continueAction}
          </Link>
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={signInHref}>
            {copy.backToSignInAction}
          </Link>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="grid gap-4">
        <article className="rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.resetPasswordInvalidTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
            {error ?? copy.resetPasswordInvalidDescription}
          </p>
        </article>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={signInHref}>
            {copy.backToSignInAction}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium text-white">
        <span>{copy.newPasswordLabel}</span>
        <input
          aria-describedby="reset-password-hint"
          className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Minimum 6 characters"}
          required
          type="password"
          value={password}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-white">
        <span>{copy.confirmPasswordLabel}</span>
        <input
          aria-describedby="reset-password-hint"
          className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
          minLength={6}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={locale === "es" ? "Repite la contraseña" : "Repeat the password"}
          required
          type="password"
          value={confirmPassword}
        />
      </label>
      <p className="muted-copy text-sm leading-6" id="reset-password-hint">
        {copy.confirmPasswordHint}
      </p>
      {error ? (
        <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-7 text-rose-100" role="alert">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          aria-label={copy.updatePasswordAction}
          className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
          disabled={isUpdating}
          type="submit"
        >
          {isUpdating ? copy.updatingPasswordAction : copy.updatePasswordAction}
        </button>
        <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={signInHref}>
          {copy.backToSignInAction}
        </Link>
      </div>
    </form>
  );
}
