import "server-only";

import { getOpenOwnerConfigurationError } from "@creed/open/lib/open-owner";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSiteUrlConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@creed/persistence/supabase/env";
import { openApiExposesCommitPersonalCreed } from "./personal-write-contract.mjs";

type SchemaVersionClient = {
  rpc(name: "creed_schema_version"): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export const REQUIRED_OPEN_SCHEMA_VERSION = "20260815162526";
const READINESS_CACHE_MS = 15_000;

export type OpenDatabaseReadiness =
  | { ready: true; schemaVersion: string }
  | {
      ready: false;
      schemaVersion: string | null;
      reason: "not-configured" | "migration-required" | "unavailable" | "write-rpc-missing";
    };

let cached:
  | { checkedAt: number; readiness: OpenDatabaseReadiness }
  | undefined;

export async function getOpenDatabaseReadiness(options?: {
  fresh?: boolean;
}): Promise<OpenDatabaseReadiness> {
  if (!isSupabaseAdminConfigured()) {
    return { ready: false, schemaVersion: null, reason: "not-configured" };
  }

  const now = Date.now();
  if (!options?.fresh && cached && now - cached.checkedAt < READINESS_CACHE_MS) {
    return cached.readiness;
  }

  const admin = getSupabaseAdminClient() as unknown as SchemaVersionClient;
  const { data, error } = await admin.rpc("creed_schema_version");
  const schemaVersion = typeof data === "string" ? data : null;
  let readiness: OpenDatabaseReadiness;
  if (error) {
    readiness = { ready: false, schemaVersion, reason: "unavailable" };
  } else if (!schemaVersion || schemaVersion < REQUIRED_OPEN_SCHEMA_VERSION) {
    readiness = { ready: false, schemaVersion, reason: "migration-required" };
  } else {
    const supabaseUrl = getSupabaseUrl();
    const secretKey = getSupabaseSecretKey();
    if (!supabaseUrl || !secretKey) {
      readiness = { ready: false, schemaVersion, reason: "not-configured" };
    } else {
      try {
        const openApiResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, {
          headers: {
            apikey: secretKey,
            Accept: "application/openapi+json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });
        if (!openApiResponse.ok) {
          readiness = { ready: false, schemaVersion, reason: "unavailable" };
        } else {
          const openApiDocument: unknown = await openApiResponse.json().catch(() => null);
          readiness = openApiExposesCommitPersonalCreed(openApiDocument)
            ? { ready: true, schemaVersion }
            : { ready: false, schemaVersion, reason: "write-rpc-missing" };
        }
      } catch {
        readiness = { ready: false, schemaVersion, reason: "unavailable" };
      }
    }
  }

  cached = { checkedAt: now, readiness };
  return readiness;
}

export type OpenSetupCheck = {
  name: string;
  ready: boolean;
};

export type OpenSetupStatus = {
  databaseReadiness: OpenDatabaseReadiness | { ready: false };
  technicalValues: OpenSetupCheck[];
  setupStates: OpenSetupCheck[];
  setupReady: boolean;
};

export async function getOpenSetupStatus(): Promise<OpenSetupStatus> {
  const databaseReadiness =
    isSupabaseAdminConfigured() && isSupabaseConfigured()
      ? await getOpenDatabaseReadiness()
      : { ready: false as const };

  const technicalValues = [
    { name: "Site URL", ready: isSiteUrlConfigured() },
    { name: "NEXT_PUBLIC_SUPABASE_URL", ready: Boolean(getSupabaseUrl()) },
    { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ready: Boolean(getSupabasePublishableKey()) },
    { name: "SUPABASE_SECRET_KEY", ready: Boolean(getSupabaseSecretKey()) },
    { name: "CREED_OWNER_SECRET", ready: !getOpenOwnerConfigurationError() },
    { name: "CREED_ENCRYPTION_SECRET", ready: Boolean(process.env.CREED_ENCRYPTION_SECRET?.trim()) },
    { name: "Supabase migrations", ready: databaseReadiness.ready },
  ];
  const environmentReady = technicalValues.slice(0, 4).every((item) => item.ready);
  const ownerAccessReady = technicalValues.slice(4, 6).every((item) => item.ready);
  const setupStates = [
    { name: "Environment", ready: environmentReady },
    { name: "Database", ready: databaseReadiness.ready },
    { name: "Owner access", ready: ownerAccessReady },
  ];
  const setupReady =
    setupStates.every((item) => item.ready) &&
    isSupabaseConfigured() &&
    isSupabaseAdminConfigured();

  return { databaseReadiness, technicalValues, setupStates, setupReady };
}
