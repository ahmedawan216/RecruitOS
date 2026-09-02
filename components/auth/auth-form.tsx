"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";

import { signIn, signUp, type AuthState } from "@/app/auth/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={8}
          required
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 pr-12 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim/60 focus:border-accent"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-ink-dim transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}

const initialState: AuthState = {};

export function AuthForm({ mode, next = "/dashboard" }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim/60 focus:border-accent"
          placeholder="you@company.com"
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        placeholder="At least 8 characters"
      />

      {mode === "sign-up" && (
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
        />
      )}

      {state.error && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/[0.04] px-4 py-3 text-sm leading-[1.6] text-red-300">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="rounded-lg border border-accent/30 bg-accent/[0.04] px-4 py-3 text-sm leading-[1.6] text-accent">
          {state.success}
        </div>
      )}

      <SubmitButton label={mode === "sign-in" ? "Sign in" : "Create account"} />

      <p className="text-center text-sm text-ink-dim">
        {mode === "sign-in" ? "New to RecruitOS? " : "Already have an account? "}
        <Link
          href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
          className="text-accent transition-opacity hover:opacity-80"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
