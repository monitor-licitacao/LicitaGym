/**
 * Extrai amostras JSON dos fixtures TS do workspace Compras.gov.
 * Uso: node scripts/extract-compras-fixtures.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "tmp", "workspace6-extract", "src", "data");
const outRoot = join(root, "fixtures", "compras-gov");

if (!existsSync(srcDir)) {
  console.error("Falta extract do tar em", srcDir);
  process.exit(1);
}

function sliceArrayLiteral(source, exportName, maxItems = 5) {
  const markers = [
    `export const ${exportName}`,
    `const ${exportName}`,
  ];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return null;
  const eq = source.indexOf("=", start);
  const arrStart = source.indexOf("[", eq);
  if (arrStart < 0) return null;

  let depth = 0;
  let i = arrStart;
  let inStr = null;
  let escape = false;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const literal = source.slice(arrStart, i);
  // Convert TS object literals to JSON-ish via Function in a sandbox-ish way:
  // replace bare keys already ok; null/true/false ok; strip trailing commas
  let js = literal
    .replace(/,\s*([\]}])/g, "$1")
    .replace(/(\w+)\s*:/g, (m, key) => {
      if (key === "true" || key === "false" || key === "null") return m;
      return `"${key}":`;
    });
  // Undo over-quoting of string values that were already quoted — the regex only hits keys.
  let data;
  try {
    data = Function(`"use strict"; return (${literal});`)();
  } catch {
    try {
      data = Function(`"use strict"; return (${js});`)();
    } catch (e) {
      console.warn(`parse fail ${exportName}:`, e.message);
      return null;
    }
  }
  if (!Array.isArray(data)) return data;
  return data.slice(0, maxItems);
}

function extractSampleData(source, candidates, maxItems = 5) {
  for (const name of candidates) {
    if (
      source.includes(`export const ${name}`) ||
      source.includes(`const ${name}`)
    ) {
      const data = sliceArrayLiteral(source, name, maxItems);
      if (data && (Array.isArray(data) ? data.length > 0 : true)) {
        return { exportName: name, data };
      }
    }
  }
  return null;
}

function extractInterfaceKeys(source, interfaceName) {
  const re = new RegExp(
    `export interface ${interfaceName}\\s*\\{([^}]+)\\}`,
    "m",
  );
  const m = source.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/^\s*(\w+)\s*[?:]/gm)].map((x) => x[1]);
}

const plan = [
  {
    secao: "01",
    files: [
      {
        file: "classeMaterial.ts",
        out: "2_consultarClasseMaterial.sample.json",
        iface: "ClasseMaterial",
        exports: ["pagina1"],
      },
      {
        file: "pdmMaterial.ts",
        out: "3_consultarPdmMaterial.sample.json",
        iface: "PdmMaterial",
        exports: ["pdmAmostra"],
      },
      {
        file: "itemMaterial.ts",
        out: "4_consultarItemMaterial.sample.json",
        iface: "ItemMaterial",
        exports: ["itemAmostra"],
      },
      {
        file: "naturezaDespesaMaterial.ts",
        out: "5_consultarMaterialNaturezaDespesa.sample.json",
        iface: "MaterialNaturezaDespesa",
        exports: ["naturezaDespesaData"],
      },
      {
        file: "unidadeFornecimentoMaterial.ts",
        out: "6_consultarMaterialUnidadeFornecimento.sample.json",
        iface: "UnidadeFornecimento",
        exports: ["unidadeFornecimentoAmostra"],
      },
      {
        file: "caracteristicaMaterial.ts",
        out: "7_consultarMaterialCaracteristicas.sample.json",
        iface: "CaracteristicaMaterial",
        exports: ["caracteristicaAmostra"],
      },
    ],
  },
  {
    secao: "03",
    files: [
      {
        file: "pesquisaPrecoMaterial.ts",
        out: "1_consultarMaterial.sample.json",
        iface: "PesquisaPrecoMaterial",
        exports: ["pesquisaPrecoAmostra"],
      },
      {
        file: "pesquisaPrecoItem.ts",
        out: "1_consultarMaterial_item.sample.json",
        iface: "PesquisaPrecoItem",
        exports: ["pesquisaPrecoItemAmostra"],
      },
      {
        file: "pesquisaPrecoDetalhe.ts",
        out: "2_consultarMaterialDetalhe.sample.json",
        iface: "PesquisaPrecoDetalhe",
        exports: ["pesquisaPrecoDetalheAmostra"],
      },
    ],
  },
  {
    secao: "04",
    files: [
      {
        file: "pgcDetalheCatalogo.ts",
        out: "2_consultarPgcDetalheCatalogo.sample.json",
        iface: "PgcDetalheCatalogo",
        exports: ["pgcDetalheCatalogoData"],
      },
    ],
  },
  {
    secao: "05",
    files: [
      {
        file: "orgao.ts",
        out: "2_consultarOrgao.sample.json",
        iface: "Orgao",
        exports: ["orgaoSampleData"],
      },
      {
        file: "uasgFalse.ts",
        out: "1_consultarUasg.sample.json",
        iface: "Uasg",
        exports: ["uasgFalseSampleData"],
      },
    ],
  },
  {
    secao: "06",
    files: [
      {
        file: "licitacao.ts",
        out: "1_consultarLicitacao.sample.json",
        iface: "Licitacao",
        exports: ["licitacaoSampleData"],
      },
      {
        file: "itemLicitacao.ts",
        out: "2_consultarItemLicitacao.sample.json",
        iface: "ItemLicitacao",
        exports: ["itemLicitacaoSampleData"],
      },
    ],
  },
];

function extractFromTestResults(source, maxItems = 3) {
  // Look for sampleData / resultado arrays nested in test results objects
  const sample = extractSampleData(source, [
    "uasgFalseSampleData",
    "orgaoSampleData",
    "licitacaoSampleData",
    "itemLicitacaoSampleData",
  ], maxItems);
  if (sample) return sample.data;

  // Try first resultado: [...] inside file
  const idx = source.indexOf("resultado:");
  if (idx < 0) return null;
  const arrStart = source.indexOf("[", idx);
  if (arrStart < 0) return null;
  let depth = 0;
  let i = arrStart;
  let inStr = null;
  let escape = false;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const literal = source.slice(arrStart, i);
  try {
    const data = Function(`"use strict"; return (${literal});`)();
    return Array.isArray(data) ? data.slice(0, maxItems) : null;
  } catch {
    return null;
  }
}

const manifest = { extractedAt: new Date().toISOString(), sections: {} };

for (const section of plan) {
  const outDir = join(outRoot, section.secao);
  mkdirSync(outDir, { recursive: true });
  manifest.sections[section.secao] = [];

  for (const spec of section.files) {
    const srcPath = join(srcDir, spec.file);
    if (!existsSync(srcPath)) {
      console.warn("missing", spec.file);
      continue;
    }
    const source = readFileSync(srcPath, "utf8");
    const keys = extractInterfaceKeys(source, spec.iface);
    let data = null;
    const found = extractSampleData(source, spec.exports, 5);
    if (found) data = found.data;
    if (!data && typeof spec.fallback === "function") data = spec.fallback();
    if (!data) data = extractFromTestResults(source, 5);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn(`no sample for ${section.secao}/${spec.out}`);
      continue;
    }

    const payload = {
      endpointHint: spec.out.replace(".sample.json", ""),
      sourceFile: spec.file,
      dtoInterface: spec.iface,
      interfaceKeys: keys,
      sample: Array.isArray(data) ? data : [data],
    };
    const outPath = join(outDir, spec.out);
    writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
    manifest.sections[section.secao].push(spec.out);
    console.log("wrote", outPath, "n=", payload.sample.length);
  }
}

writeFileSync(
  join(outRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);
console.log("done", outRoot);
