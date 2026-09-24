/** PostgREST max-rows safe pagination helpers for sync Edge functions. */

export const POSTGREST_PAGE_SIZE = 1000;

export type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Fetch all rows via repeated `.range(from, to)` until a short page.
 * Avoids silent truncation at the PostgREST max-rows default (1000).
 *
 * Accepts PromiseLike so Supabase PostgrestFilterBuilder (Thenable) works
 * without wrapping the builder in `async` / `await`.
 *
 * Caller MUST apply `.order(<unique stable column>)` before `.range(...)`.
 * Without a deterministic order, offset pages can skip/duplicate rows.
 * Prefer PK / unique natural keys (e.g. `id`, `codigo_pdm`, `codigo_item`).
 */
export async function fetchAllByRange<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = POSTGREST_PAGE_SIZE,
): Promise<{ rows: T[]; pages: number }> {
  const rows: T[] = [];
  let pages = 0;
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    pages += 1;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { rows, pages };
}

/** Chunk an `.in(...)` filter list so URL/body size stays bounded. */
export function chunkValues<T>(values: readonly T[], size = POSTGREST_PAGE_SIZE): T[][] {
  if (values.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size) as T[]);
  }
  return chunks;
}
