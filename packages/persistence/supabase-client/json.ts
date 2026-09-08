import type { Json } from "./database-cloud";

/** Normalize a domain payload to the JSON representation sent to Postgres. */
export function databaseJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
