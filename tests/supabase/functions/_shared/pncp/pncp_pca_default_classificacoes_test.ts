/**
 * Item 4 — PCA default seed is CORE 7830 only (not 7220 catalog extension).
 */
import { assertEquals } from "jsr:@std/assert@1";
import {
  defaultPcaClassificacoes,
  LICITAGYM_CATMAT_CLASSE,
  resolvePcaClassificacoes,
} from "../../../../../supabase/functions/_shared/pncp/licitagym-catmat.ts";

Deno.test("defaultPcaClassificacoes without env is only 7830", () => {
  Deno.env.delete("PNCP_PCA_CLASSIFICACOES");
  assertEquals(LICITAGYM_CATMAT_CLASSE, "7830");
  assertEquals(defaultPcaClassificacoes(), ["7830"]);
  assertEquals(resolvePcaClassificacoes({}), ["7830"]);
});

Deno.test("PNCP_PCA_CLASSIFICACOES env overrides default explicitly", () => {
  Deno.env.set("PNCP_PCA_CLASSIFICACOES", "7830,7220");
  try {
    assertEquals(defaultPcaClassificacoes(), ["7830", "7220"]);
  } finally {
    Deno.env.delete("PNCP_PCA_CLASSIFICACOES");
  }
});
