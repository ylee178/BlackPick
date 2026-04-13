// Type declarations for lucide-react's per-icon internal modules.
//
// The top-level `lucide-react` package ships `ShieldCheck`, `KeyRound`, etc.
// as forwardRef components marked `'use client'` (via Icon.js). That's fine
// for the web UI, but Next.js ImageResponse server routes cannot call client
// components. The per-icon module at `lucide-react/dist/esm/icons/<name>.js`
// additionally exports the raw `__iconNode` data as a server-safe alternative,
// but it has no `.d.ts` declaration file in the package itself.
//
// This shim lets `src/app/email/icon-*/route.tsx` import the raw node data
// with full type safety. If lucide-react refactors the internal path or
// renames `__iconNode` in a future version, the build will fail loudly — pin
// the version or update the import.
declare module "lucide-react/dist/esm/icons/*.js" {
  type IconNode = ReadonlyArray<
    readonly [string, Readonly<Record<string, string | number>>]
  >;
  export const __iconNode: IconNode;
  const component: unknown;
  export default component;
}
