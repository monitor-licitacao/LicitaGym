/**
 * Item 2 — continuation chain shares last_seen marker; inactivate only on concluida.
 */
import { assertEquals } from "jsr:@std/assert@1";
import {
  mayInactivateNotSeen,
  resolveContinuationChainId,
} from "../../../../../supabase/functions/_shared/pncp/pagination-budget.ts";

Deno.test("mayInactivateNotSeen: only completo+concluida", () => {
  assertEquals(mayInactivateNotSeen("completo", "concluida"), true);
  assertEquals(mayInactivateNotSeen("completo", "concluida_com_erros"), false);
  assertEquals(mayInactivateNotSeen("completo", "incompleta"), false);
  assertEquals(mayInactivateNotSeen("incremental", "concluida"), false);
});

Deno.test("resolveContinuationChainId: first run uses current id", () => {
  const current = "run-1";
  assertEquals(resolveContinuationChainId(null, current), current);
  assertEquals(
    resolveContinuationChainId(
      { id: "old", status: "concluida", parametros: {} },
      current,
    ),
    current,
  );
});

Deno.test("resolveContinuationChainId: inherits chain_id across incompleta runs", () => {
  const root = "chain-root";
  const run2 = "run-2";
  const run3 = "run-3";

  const afterRun1 = resolveContinuationChainId(
    { id: root, status: "incompleta", parametros: { continuation: { pending: [] } } },
    run2,
  );
  assertEquals(afterRun1, root);

  const afterRun2 = resolveContinuationChainId(
    {
      id: run2,
      status: "incompleta",
      parametros: { continuation: { pending: [], chain_id: root } },
    },
    run3,
  );
  assertEquals(afterRun2, root);
});

Deno.test("3-run chain: rows stamped with shared chain stay active until concluida", () => {
  // Simulate last_seen stamps without DB: runs 1–2 incompleta must not inactivate.
  const chainId = "chain-abc";
  const seen = new Map<string, string>();

  const stamp = (rowId: string, marker: string) => {
    seen.set(rowId, marker);
  };
  const wouldInactivate = (
    modo: string,
    status: string,
    marker: string,
  ): string[] => {
    if (!mayInactivateNotSeen(modo, status)) return [];
    return [...seen.entries()]
      .filter(([, last]) => last !== marker)
      .map(([id]) => id);
  };

  // Run 1: see A,B — incompleta
  stamp("A", chainId);
  stamp("B", chainId);
  assertEquals(wouldInactivate("completo", "incompleta", chainId), []);

  // Run 2 (continuation): see C with same chain — incompleta
  stamp("C", chainId);
  assertEquals(wouldInactivate("completo", "incompleta", chainId), []);

  // Run 3: chain ends concluida — only rows not stamped with chain would die
  stamp("D", chainId);
  assertEquals(wouldInactivate("completo", "concluida", chainId), []);

  // Stale row from unrelated marker would be inactivated on concluida
  seen.set("STALE", "other-run");
  assertEquals(wouldInactivate("completo", "concluida", chainId), ["STALE"]);
  assertEquals(wouldInactivate("completo", "concluida_com_erros", chainId), []);
});
