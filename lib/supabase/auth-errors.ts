export const SIGN_UP_ERROR_FALLBACK = "Unable to create your account. Please try again.";

export function getUserFacingAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return fallback;

  const normalized = message.trim();
  return normalized && !/^\{\s*\}$/.test(normalized) ? normalized : fallback;
}
