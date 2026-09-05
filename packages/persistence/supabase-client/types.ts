import type { Database as CloudDatabase } from "./database-cloud";
import type { Database as OpenDatabase } from "./database-open";
import type { User } from "@supabase/supabase-js";

// Shared repository boundary: generated schemas check table names, filters,
// write shapes and RPC arguments; domain mappers narrow read results.

export type SupabaseLikeQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

export type Tables = CloudDatabase["public"]["Tables"] & Pick<OpenDatabase["public"]["Tables"], Exclude<keyof OpenDatabase["public"]["Tables"], keyof CloudDatabase["public"]["Tables"]>>;
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];
type TableName = keyof Tables;
export type Functions = CloudDatabase["public"]["Functions"] & Pick<OpenDatabase["public"]["Functions"], Exclude<keyof OpenDatabase["public"]["Functions"], keyof CloudDatabase["public"]["Functions"]>>;

export type SupabaseLikeQuery<T extends TableName = TableName> = PromiseLike<SupabaseLikeQueryResult> & {
  eq: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  is: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  in: (column: keyof Tables[T]["Row"] & string, values: unknown[]) => SupabaseLikeQuery<T>;
  gte: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  gt: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  lte: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  lt: (column: keyof Tables[T]["Row"] & string, value: unknown) => SupabaseLikeQuery<T>;
  order: (
    column: keyof Tables[T]["Row"] & string,
    options?: Record<string, unknown>
  ) => SupabaseLikeQuery<T>;
  limit: (count: number) => SupabaseLikeQuery<T>;
  select: (
    columns?: string,
    options?: Record<string, unknown>
  ) => SupabaseLikeQuery<T>;
  maybeSingle: () => Promise<SupabaseLikeQueryResult>;
  single: () => Promise<SupabaseLikeQueryResult>;
};

export type SupabaseLikeClient = {
  rpc: <F extends keyof Functions>(
    functionName: F,
    params?: { [K in keyof Functions[F]["Args"]]: Functions[F]["Args"][K] | null },
  ) => Promise<SupabaseLikeQueryResult>;
  from: <T extends TableName>(table: T) => {
    select: (columns?: string, options?: Record<string, unknown>) => SupabaseLikeQuery<T>;
    insert: (values: Tables[T]["Insert"] | Tables[T]["Insert"][], options?: Record<string, unknown>) => SupabaseLikeQuery<T>;
    update: (values: Tables[T]["Update"]) => SupabaseLikeQuery<T>;
    upsert: (values: Tables[T]["Insert"] | Tables[T]["Insert"][], options?: Record<string, unknown>) => SupabaseLikeQuery<T>;
    delete: () => SupabaseLikeQuery<T>;
  };
  auth?: {
    admin?: {
      getUserById?: (
        id: string
      ) => Promise<{ data: { user: User | null }; error: { message: string } | null }>;
    };
  };
};

export type Database = { public: { Tables: Tables; Functions: Functions; Views: CloudDatabase["public"]["Views"]; Enums: CloudDatabase["public"]["Enums"]; CompositeTypes: CloudDatabase["public"]["CompositeTypes"] } };
