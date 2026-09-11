"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function getPaddleClient(): Promise<Paddle | undefined> {
  if (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT !== "sandbox") {
    return Promise.reject(new Error("Paddle Checkout is configured for sandbox only."));
  }

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return Promise.reject(new Error("Paddle client token is not configured."));

  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment: "sandbox",
      token,
    });
  }

  return paddlePromise;
}
