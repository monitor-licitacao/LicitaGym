/** Ambient types for Supabase Edge Functions (Cursor/VS Code TS language service). */

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }

  const env: Env;

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}

declare module "npm:@supabase/supabase-js@2" {
  interface PostgrestError {
    message: string;
  }

  interface PostgrestQueryResult {
    data: Record<string, unknown> | Record<string, unknown>[] | null;
    error: PostgrestError | null;
    count?: number | null;
  }

  interface PostgrestSingleResult {
    data: Record<string, unknown> | null;
    error: PostgrestError | null;
    count?: number | null;
  }

  interface PostgrestBuilder extends PromiseLike<PostgrestQueryResult> {
    select(
      columns?: string,
      options?: { count?: "exact" },
    ): PostgrestBuilder;
    insert(values: unknown): PostgrestBuilder;
    update(values: unknown): PostgrestBuilder;
    upsert(
      values: unknown,
      options?: { onConflict?: string; ignoreDuplicates?: boolean },
    ): PostgrestBuilder;
    eq(column: string, value: unknown): PostgrestBuilder;
    neq(column: string, value: unknown): PostgrestBuilder;
    order(
      column: string,
      options?: { ascending?: boolean },
    ): PostgrestBuilder;
    range(from: number, to: number): PostgrestBuilder;
    limit(count: number): PostgrestBuilder;
    maybeSingle(): Promise<PostgrestSingleResult>;
    single(): Promise<PostgrestSingleResult>;
  }

  export interface SupabaseClient {
    from(relation: string): PostgrestBuilder;
    schema(name: string): { from(relation: string): PostgrestBuilder };
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): SupabaseClient;
}
