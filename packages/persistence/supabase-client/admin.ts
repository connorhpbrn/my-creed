import type { Database } from "./types";
import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from "@creed/persistence/supabase/env";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin client is not configured.");
  }

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
