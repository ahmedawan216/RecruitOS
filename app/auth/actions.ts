"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createCookieStorage, createSupabaseAuthClient, getSafeRedirectPath } from "@/lib/supabase/auth";
import { clearSessionCookies, setSessionCookies } from "@/lib/supabase/auth-cookies";
import { getUserFacingAuthErrorMessage, SIGN_UP_ERROR_FALLBACK } from "@/lib/supabase/auth-errors";

export type AuthState = { error?: string; success?: string };

function normalizeEmail(value: FormDataEntryValue | null) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function normalizePassword(value: FormDataEntryValue | null) { return typeof value === "string" ? value : ""; }

export async function signIn(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizePassword(formData.get("password"));
  const next = getSafeRedirectPath(formData.get("next"));
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { error: error?.message === "Email not confirmed" ? "Please confirm your email before signing in." : "Invalid email or password." };
  }

  const cookieStore = await cookies();
  setSessionCookies(cookieStore, data.session.access_token, data.session.refresh_token);
  redirect(next);
}

export async function signUp(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizePassword(formData.get("password"));
  const confirmPassword = normalizePassword(formData.get("confirmPassword"));
  const next = getSafeRedirectPath(formData.get("next"));
  if (!email || !password || !confirmPassword) return { error: "Complete all required fields." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const cookieStore = await cookies();
  const supabase = createSupabaseAuthClient(undefined, createCookieStorage(cookieStore));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", siteUrl.replace(/\/$/, ""));
  callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) return { error: getUserFacingAuthErrorMessage(error, SIGN_UP_ERROR_FALLBACK) };

  if (data.session) {
    setSessionCookies(cookieStore, data.session.access_token, data.session.refresh_token);
    redirect(next);
  }

  return { success: "Account created. Check your email to confirm your account, then sign in." };
}

export async function signOut() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("operationos-access-token")?.value;
  if (accessToken) {
    const supabase = createSupabaseAuthClient(accessToken);
    await supabase.auth.signOut({ scope: "local" });
  }
  clearSessionCookies(cookieStore);
  redirect("/");
}
