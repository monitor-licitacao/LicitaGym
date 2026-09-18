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

declare module "npm:@supabase/supabase-js@2" {
  interface PostgrestFilterBuilder {
    eq(column: string, value: unknown): PostgrestFilterBuilder;
    order(
      column: string,
      options?: { ascending?: boolean },
    ): PostgrestFilterBuilder;
    range(from: number, to: number): Promise<PostgrestQueryResult>;
  }

  interface PostgrestQueryResult {
    data: unknown;
    error: { message: string } | null;
    count?: number | null;
  }

  export interface SupabaseClient {
    from(relation: string): {
      select(
        columns?: string,
        options?: { count?: "exact" },
      ): PostgrestFilterBuilder;
    };
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): SupabaseClient;
}
