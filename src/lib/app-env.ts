export const APP_ENV_VALUES = ["local", "development", "production"] as const;

export type AppEnv = (typeof APP_ENV_VALUES)[number];

type ResolveAppEnvInput = {
  appEnv?: string | null;
  publicAppEnv?: string | null;
  nodeEnv?: string | null;
  vercelEnv?: string | null;
};

export function normalizeAppEnv(value?: string | null): AppEnv | null {
  if (!value) return null;

  switch (value.trim().toLowerCase()) {
    case "local":
    case "localhost":
      return "local";
    case "dev":
    case "develop":
    case "development":
    case "preview":
    case "staging":
      return "development";
    case "prod":
    case "production":
      return "production";
    default:
      return null;
  }
}

export function resolveAppEnv(input: ResolveAppEnvInput = {}): AppEnv {
  const configuredAppEnv =
    normalizeAppEnv(input.appEnv) ?? normalizeAppEnv(input.publicAppEnv);

  if (configuredAppEnv) {
    return configuredAppEnv;
  }

  if ((input.nodeEnv ?? process.env.NODE_ENV) !== "production") {
    return "local";
  }

  const vercelEnv = (input.vercelEnv ?? process.env.VERCEL_ENV)?.toLowerCase();
  if (vercelEnv === "preview") {
    return "development";
  }

  return "production";
}

export function getAppEnv(): AppEnv {
  return resolveAppEnv({
    appEnv: process.env.APP_ENV,
    publicAppEnv: process.env.NEXT_PUBLIC_APP_ENV,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}

export function isDevelopmentApp() {
  const appEnv = getAppEnv();
  return appEnv === "local" || appEnv === "development";
}

export function isProductionApp() {
  return getAppEnv() === "production";
}
