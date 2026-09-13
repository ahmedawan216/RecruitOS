import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

let client: Paddle | null = null;

function getServerEnvironment() {
  const value = process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase();
  if (value === "sandbox") return Environment.sandbox;
  if (value === "production" || value === "live") return Environment.production;
  throw new Error("PADDLE_ENVIRONMENT_INVALID");
}

export function assertPaddleServerConfig() {
  getServerEnvironment();
  if (!process.env.PADDLE_API_KEY) throw new Error("PADDLE_API_KEY_MISSING");
}

export function getPaddleServerClient(): Paddle {
  assertPaddleServerConfig();
  if (!client) {
    client = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: getServerEnvironment(),
    });
  }
  return client;
}

export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET_MISSING");
  return secret;
}
