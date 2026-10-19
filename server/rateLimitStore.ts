import { createHash } from "node:crypto";
import type { Request } from "express";
import rateLimit, {
  ipKeyGenerator,
  type Options,
  type Store,
  type ClientRateLimitInfo,
  type IncrementResponse,
} from "express-rate-limit";
import type { ChatErrorBody } from "@shared/chat.ts";
import {
  decrementRateLimit,
  deleteRateLimit,
  getRateLimit,
  incrementRateLimit,
} from "./storage.ts";

// express-rate-limit store backed by Postgres (`rate_limits` table), so the
// counters are shared between serverless instances (the default in-memory
// store is per instance and resets on every cold start).

// Only used if RATE_LIMIT_SALT is not configured. The salt keeps the stored
// hashes from being reversed by brute-forcing the IPv4 space.
const FALLBACK_SALT = "digital-twin-portfolio-rate-limit";

export function hashClientKey(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? FALLBACK_SALT;
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex")
    .slice(0, 32);
}

export class PostgresRateLimitStore implements Store {
  localKeys = false;
  prefix: string;
  private windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private k(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    return getRateLimit(this.k(key), this.windowMs);
  }

  async increment(key: string): Promise<IncrementResponse> {
    return incrementRateLimit(this.k(key), this.windowMs);
  }

  async decrement(key: string): Promise<void> {
    await decrementRateLimit(this.k(key));
  }

  async resetKey(key: string): Promise<void> {
    await deleteRateLimit(this.k(key));
  }
}

export function createLimiter(opts: {
  prefix: string;
  windowMs: number;
  limit: number;
  message: string;
}) {
  const body: ChatErrorBody = { code: "rate_limited", message: opts.message };
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PostgresRateLimitStore(opts.prefix, opts.windowMs),
    keyGenerator: (req: Request) => hashClientKey(ipKeyGenerator(req.ip ?? "")),
    // If the database is unreachable the request fails later anyway; don't
    // turn a rate-limit store error into a different failure mode.
    passOnStoreError: true,
    handler: (_req, res) => {
      res.status(429).json(body);
    },
  });
}
