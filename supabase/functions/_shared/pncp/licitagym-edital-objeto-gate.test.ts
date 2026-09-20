import { matchCatalogoEditalObjeto } from "./licitagym-edital-objeto-gate.ts";

Deno.test("fitness musculacao passa", () => {
  const r = matchCatalogoEditalObjeto(
    "Aquisição de aparelhos de musculação para academia municipal",
  );
  if (!r.ok || !r.dominios.includes("fitness_7830")) {
    throw new Error(`esperado fitness: ${JSON.stringify(r)}`);
  }
});

Deno.test("piso epdm passa", () => {
  const r = matchCatalogoEditalObjeto(
    "Fornecimento de piso de borracha EPDM modular para academia",
  );
  if (!r.ok || !r.dominios.includes("piso_7220")) {
    throw new Error(`esperado piso: ${JSON.stringify(r)}`);
  }
});

Deno.test("obra civil asfalto nao passa", () => {
  const r = matchCatalogoEditalObjeto(
    "Recapeamento asfáltico e pavimentação de vias públicas",
  );
  if (r.ok) throw new Error(`obra nao deveria passar: ${JSON.stringify(r)}`);
});

Deno.test("creche construcao nao passa", () => {
  const r = matchCatalogoEditalObjeto(
    "Construção de creche modelo — serviços de construção civil",
  );
  if (r.ok) throw new Error(`creche nao deveria passar: ${JSON.stringify(r)}`);
});
