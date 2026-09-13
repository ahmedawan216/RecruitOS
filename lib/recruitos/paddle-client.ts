"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getClientEnvironment() {
  const value = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase();
  if (value === "sandbox") return "sandbox" as const;
  if (value === "production" || value === "live") return "production" as const;
  throw new Error("Paddle Checkout environment is not configured.");
}

export function getPaddleClient(): Promise<Paddle | undefined> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return Promise.reject(new Error("Paddle client token is not configured."));

  const environment = getClientEnvironment();
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token,
      ...(environment === "sandbox" ? { environment: "sandbox" as const } : {}),
    });
  }

  return paddlePromise;
}
