import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

let client: Paddle | null = null;

export function assertPaddleSandboxServerConfig() {
  if (process.env.PADDLE_ENVIRONMENT !== "sandbox") {
    throw new Error("PADDLE_SANDBOX_REQUIRED");
  }
  if (!process.env.PADDLE_API_KEY) throw new Error("PADDLE_API_KEY_MISSING");
}

export function getPaddleServerClient(): Paddle {
  assertPaddleSandboxServerConfig();
  if (!client) {
    client = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: Environment.sandbox,
    });
  }
  return client;
}

export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET_MISSING");
  return secret;
}
