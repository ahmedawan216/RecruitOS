"use client";

import { captureClient } from "@/lib/analytics/client";
import Link from "next/link";
import { useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

function SubmitButton({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors duration-[180ms] hover:bg-[#0a5555] disabled:cursor-not-allowed disabled:opacity-60">{pending ? (mode === "sign-in" ? "Signing in..." : "Creating account...") : (mode === "sign-in" ? "Sign in" : "Create account")}</button>;
}

function PasswordField({ id, name, label, autoComplete, describedBy, invalid }: { id: string; name: string; label: string; autoComplete: string; describedBy?: string; invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">{label}</label><div className="relative"><input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required aria-invalid={invalid || undefined} aria-describedby={describedBy} className="workspace-control pr-12" placeholder="At least 8 characters" /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-ink-dim transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">{visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</button></div></div>;
}

const initialState: AuthState = {};

export function AuthForm({ mode, next = "/dashboard" }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const signupStarted = useRef(false);
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction] = useActionState(action, initialState);
  const messageId = state.error || state.success ? "auth-form-message" : undefined;
  const alternateHref = mode === "sign-in"
    ? `/sign-up?next=${encodeURIComponent(next)}`
    : `/sign-in?next=${encodeURIComponent(next)}`;

  return <form onSubmit={() => { if (mode === "sign-up" && !signupStarted.current) { signupStarted.current = captureClient("signup_started"); } }} action={formAction} className="space-y-5" noValidate={false}>
    <input type="hidden" name="next" value={next} />
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">Work email</label><input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(state.error) || undefined} aria-describedby={messageId} className="workspace-control" placeholder="you@company.com" /></div>
    <PasswordField id="password" name="password" label="Password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} describedBy={messageId ?? (mode === "sign-up" ? "password-guidance" : undefined)} invalid={Boolean(state.error)} />
    {mode === "sign-up" ? <><p id="password-guidance" className="-mt-3 text-xs leading-5 text-ink-faint">Use at least 8 characters.</p><PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password" autoComplete="new-password" describedBy={messageId} invalid={Boolean(state.error)} /></> : null}
    {state.error ? <div id="auth-form-message" role="alert" className="rounded-lg border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm leading-6 text-danger">{state.error}</div> : null}
    {state.success ? <div id="auth-form-message" role="status" className="rounded-lg border border-success/25 bg-success/[0.05] px-4 py-3 text-sm leading-6 text-success">{state.success}</div> : null}
    <SubmitButton mode={mode} />
    <p className="text-center text-sm text-ink-dim">{mode === "sign-in" ? "New to RecruitOS? " : "Already have an account? "}<Link href={alternateHref} className="font-medium text-accent hover:underline">{mode === "sign-in" ? "Create an account" : "Sign in"}</Link></p>
  </form>;
}
