import "server-only";

export function assertSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new Error("ORIGIN_REQUIRED");

  const expectedOrigin = new URL(request.url).origin;
  let receivedOrigin: string;
  try {
    receivedOrigin = new URL(origin).origin;
  } catch {
    throw new Error("ORIGIN_INVALID");
  }

  if (receivedOrigin !== expectedOrigin) throw new Error("ORIGIN_MISMATCH");
}
