import { defineConfig, globalIgnores } from "eslint/config";
import appConfig from "./packages/creed-app/eslint.config.mjs";

export default defineConfig([
  ...appConfig,
  globalIgnores([
    "**/.next*/**", "**/node_modules/**", "**/next-env.d.ts", "**/build/**",
    "**/out/**", "disposable/**", "**/supabase/.temp/**",
  ]),
  { settings: { next: { rootDir: ["apps/*/", "packages/creed-app/"] } } },
]);
