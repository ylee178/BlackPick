import { describe, expect, it } from "vitest";
import {
  getAppEnv,
  isDevelopmentApp,
  isProductionApp,
  normalizeAppEnv,
  resolveAppEnv,
} from "./app-env";

describe("app environment helpers", () => {
  it("normalizes supported aliases", () => {
    expect(normalizeAppEnv("dev")).toBe("development");
    expect(normalizeAppEnv("preview")).toBe("development");
    expect(normalizeAppEnv("prod")).toBe("production");
    expect(normalizeAppEnv("localhost")).toBe("local");
    expect(normalizeAppEnv("weird")).toBeNull();
  });

  it("prefers explicit app env values", () => {
    expect(resolveAppEnv({ appEnv: "production", nodeEnv: "development" })).toBe("production");
    expect(resolveAppEnv({ publicAppEnv: "development", nodeEnv: "production" })).toBe(
      "development",
    );
  });

  it("treats preview deployments as development when no explicit app env is set", () => {
    expect(resolveAppEnv({ nodeEnv: "production", vercelEnv: "preview" })).toBe("development");
  });

  it("treats non-production node environments as local", () => {
    expect(resolveAppEnv({ nodeEnv: "development" })).toBe("local");
    expect(resolveAppEnv({ nodeEnv: "test" })).toBe("local");
  });

  it("defaults to production for deployed builds without an override", () => {
    expect(resolveAppEnv({ nodeEnv: "production", vercelEnv: "production" })).toBe("production");
  });

  it("exposes convenience helpers through process env resolution", () => {
    const env = process.env as Record<string, string | undefined>;
    const original = {
      APP_ENV: env.APP_ENV,
      NEXT_PUBLIC_APP_ENV: env.NEXT_PUBLIC_APP_ENV,
      NODE_ENV: env.NODE_ENV,
      VERCEL_ENV: env.VERCEL_ENV,
    };

    try {
      env.APP_ENV = "development";
      env.NEXT_PUBLIC_APP_ENV = "";
      env.NODE_ENV = "production";
      env.VERCEL_ENV = "production";

      expect(getAppEnv()).toBe("development");
      expect(isDevelopmentApp()).toBe(true);
      expect(isProductionApp()).toBe(false);

      env.APP_ENV = "production";

      expect(getAppEnv()).toBe("production");
      expect(isDevelopmentApp()).toBe(false);
      expect(isProductionApp()).toBe(true);
    } finally {
      env.APP_ENV = original.APP_ENV;
      env.NEXT_PUBLIC_APP_ENV = original.NEXT_PUBLIC_APP_ENV;
      env.NODE_ENV = original.NODE_ENV;
      env.VERCEL_ENV = original.VERCEL_ENV;
    }
  });
});
