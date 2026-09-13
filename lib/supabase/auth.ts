import "server-only";

import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isPaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/supabase/auth-cookies";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

type MutableCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options: typeof cookieOptions) => void;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public URL/key is missing from environment variables.");
  return { url, key };
}

export function createCookieStorage(cookieStore: MutableCookieStore): SupportedStorage {
  return {
    getItem: (key) => cookieStore.get(key)?.value ?? null,
    setItem: (key, value) => cookieStore.set(key, value, cookieOptions),
    removeItem: (key) => cookieStore.set(key, "", { ...cookieOptions, maxAge: 0 }),
  };
}

export function createSupabaseAuthClient(accessToken?: string, storage?: SupportedStorage) {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      ...(storage ? { storage } : {}),
    },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  const supabase = createSupabaseAuthClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function getAuthTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export function getSafeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";

  let parsed: URL;
  try {
    parsed = new URL(value, "https://recruitos.internal");
  } catch {
    return "/dashboard";
  }

  if (parsed.origin !== "https://recruitos.internal") return "/dashboard";

  if (parsed.pathname === "/dashboard" || parsed.pathname.startsWith("/dashboard/")) {
    return parsed.pathname + parsed.search;
  }

  if (parsed.pathname === "/checkout") {
    const plan = parsed.searchParams.get("plan");
    if (isPaidPlanKey(plan) && parsed.searchParams.size === 1) {
      return `/checkout?plan=${plan}`;
    }
  }

  return "/dashboard";
}
