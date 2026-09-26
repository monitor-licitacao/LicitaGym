#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Reprojeção P0: classificacao_catalogo_id em pca_itens a partir de source_record.
 *
 * Uso:
 *   deno run -A scripts/ops/reprojetar-pca-classificacao.ts
 *   deno run -A scripts/ops/reprojetar-pca-classificacao.ts --limite 50 --confirmar
 *   deno run -A scripts/ops/reprojetar-pca-classificacao.ts --rollback --snapshot-id <id>
 *
 * Padrão: --dry-run (não grava). Exige SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServiceClient } from "../../supabase/functions/_shared/pncp/supabase-admin.ts";
import {
  DEFAULT_PCA_REPROJECTION_LOCK_KEY,
  restorePcaItensSnapshot,
  runPcaReprojecaoClassificacao,
  takePcaItensSnapshot,
} from "../../supabase/functions/_shared/pncp/pca-reprojecao.ts";

function parseArgs(argv: string[]) {
  const out = {
    dryRun: true,
    confirmar: false,
    limite: undefined as number | undefined,
    lockKey: DEFAULT_PCA_REPROJECTION_LOCK_KEY,
    snapshotId: undefined as string | undefined,
    rollback: false,
    snapshotOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirmar") {
      out.confirmar = true;
      out.dryRun = false;
    } else if (a === "--dry-run") {
      out.dryRun = true;
      out.confirmar = false;
    } else if (a === "--limite") {
      out.limite = Number(argv[++i]);
    } else if (a === "--lock-key") {
      out.lockKey = argv[++i];
    } else if (a === "--snapshot-id") {
      out.snapshotId = argv[++i];
    } else if (a === "--rollback") {
      out.rollback = true;
    } else if (a === "--snapshot-only") {
      out.snapshotOnly = true;
    }
  }
  return out;
}

const args = parseArgs(Deno.args);
const client = createServiceClient();

if (args.rollback) {
  if (!args.snapshotId) {
    console.error("--rollback exige --snapshot-id");
    Deno.exit(2);
  }
  const n = await restorePcaItensSnapshot(client, args.snapshotId);
  console.log(JSON.stringify({ rollback: true, snapshot_id: args.snapshotId, restored: n }, null, 2));
  Deno.exit(0);
}

if (args.snapshotOnly) {
  const id = args.snapshotId ??
    `pca-pre-p0-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const n = await takePcaItensSnapshot(client, id);
  console.log(JSON.stringify({ snapshot_id: id, rows: n }, null, 2));
  Deno.exit(0);
}

try {
  const report = await runPcaReprojecaoClassificacao(client, {
    dryRun: args.dryRun,
    limite: args.limite,
    lockKey: args.lockKey,
    snapshotId: args.snapshotId,
    takeSnapshot: !args.dryRun,
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.erros.length > 0) Deno.exit(2);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  Deno.exit(1);
}
