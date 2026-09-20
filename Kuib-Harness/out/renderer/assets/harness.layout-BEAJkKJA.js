import { d as defineComponent, o as openBlock, c as createElementBlock, n as normalizeClass, u as unref, a as createBaseVNode, r as renderSlot, b as ref, e as computed, f as createVNode, w as withCtx, g as createTextVNode, F as Fragment, h as renderList, t as toDisplayString, i as withKeys, j as withModifiers, k as isRef, l as onMounted, m as onUnmounted, p as createCommentVNode, q as createBlock, s as inject, v as h, x as defineStore, y as useAuthStore, R as RouterLink, z as useRouter } from "./index-BsLBVoAX.js";
import { _ as _sfc_main$6 } from "./Badge.vue_vue_type_script_setup_true_lang-BF7c0FOf.js";
import { c as cn, _ as _sfc_main$7 } from "./index-1pL5IT2O.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1$5 = { class: "h-full w-full overflow-auto" };
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "ScrollArea",
  props: {
    class: { type: [Boolean, null, String, Object, Array] }
  },
  setup(__props) {
    const props = __props;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(cn)("relative overflow-hidden", props.class))
      }, [
        createBaseVNode("div", _hoisted_1$5, [
          renderSlot(_ctx.$slots, "default")
        ])
      ], 2);
    };
  }
});
const _hoisted_1$4 = ["value", "placeholder", "rows"];
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "Textarea",
  props: {
    modelValue: {},
    class: { type: [Boolean, null, String, Object, Array] },
    placeholder: {},
    rows: {}
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("textarea", {
        value: __props.modelValue,
        placeholder: __props.placeholder,
        rows: __props.rows ?? 3,
        class: normalizeClass(
          unref(cn)(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            props.class
          )
        ),
        onInput: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event.target.value))
      }, null, 42, _hoisted_1$4);
    };
  }
});
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
const draft = ref("");
const messages = ref([
  {
    id: uid(),
    role: "assistant",
    content: "Kuib Harness pronto. Descreva a tarefa para eu organizar no kanban.",
    createdAt: Date.now()
  }
]);
const canSend = computed(() => draft.value.trim().length > 0);
function sendMessage() {
  const text = draft.value.trim();
  if (!text) return;
  messages.value.push({
    id: uid(),
    role: "user",
    content: text,
    createdAt: Date.now()
  });
  draft.value = "";
  messages.value.push({
    id: uid(),
    role: "assistant",
    content: `Recebi: “${text}”. Use o kanban à direita para acompanhar o fluxo.`,
    createdAt: Date.now()
  });
}
function useChatScript() {
  return { draft, messages, canSend, sendMessage };
}
const _hoisted_1$3 = { class: "chat" };
const _hoisted_2$3 = { class: "chat__header" };
const _hoisted_3$3 = { class: "chat__composer" };
const _hoisted_4$3 = { class: "chat__actions" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "chat.layout",
  setup(__props) {
    const { draft: draft2, messages: messages2, canSend: canSend2, sendMessage: sendMessage2 } = useChatScript();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", _hoisted_1$3, [
        createBaseVNode("header", _hoisted_2$3, [
          _cache[2] || (_cache[2] = createBaseVNode("h2", { class: "chat__title" }, "Chat", -1)),
          createVNode(unref(_sfc_main$6), { variant: "secondary" }, {
            default: withCtx(() => [..._cache[1] || (_cache[1] = [
              createTextVNode("local", -1)
            ])]),
            _: 1
          })
        ]),
        createVNode(unref(_sfc_main$5), { class: "chat__messages" }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(messages2), (msg) => {
              return openBlock(), createElementBlock("div", {
                key: msg.id,
                class: normalizeClass(["chat__bubble", msg.role === "user" ? "chat__bubble--user" : "chat__bubble--assistant"])
              }, toDisplayString(msg.content), 3);
            }), 128))
          ]),
          _: 1
        }),
        createBaseVNode("footer", _hoisted_3$3, [
          createVNode(unref(_sfc_main$4), {
            modelValue: unref(draft2),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(draft2) ? draft2.value = $event : null),
            placeholder: "Descreva a tarefa…",
            rows: 3,
            onKeydown: withKeys(withModifiers(unref(sendMessage2), ["exact", "prevent"]), ["enter"])
          }, null, 8, ["modelValue", "onKeydown"]),
          createBaseVNode("div", _hoisted_4$3, [
            createVNode(unref(_sfc_main$7), {
              disabled: !unref(canSend2),
              onClick: unref(sendMessage2)
            }, {
              default: withCtx(() => [..._cache[3] || (_cache[3] = [
                createTextVNode("Enviar", -1)
              ])]),
              _: 1
            }, 8, ["disabled", "onClick"])
          ])
        ])
      ]);
    };
  }
});
const ChatLayout = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-607e4e49"]]);
[
  {
    slug: "sync-compras-catmat",
    functionName: "sync-compras-catmat",
    source: "Compras.gov Dados Abertos",
    tables: "catmat_*, catalogo_itens",
    invokeScript: "scripts/invoke-sync-compras-catmat.ps1",
    gateNotes: "classes 78/7830 + 72/7220; características em lotes separados",
    cronKind: "proposed",
    cronExpression: "0 4 * * 1",
    cronJobName: "compras-catmat-7830",
    defaultBody: {
      codigo_grupo: 78,
      codigo_classe: 7830,
      incluir_caracteristicas: false,
      max_paginas: 500
    },
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 1,
    requiresApproval: false
  },
  {
    slug: "sync-compras-catmat-7220",
    functionName: "sync-compras-catmat",
    source: "Compras.gov Dados Abertos",
    tables: "catmat_* (7220)",
    invokeScript: "scripts/invoke-sync-compras-catmat.ps1",
    gateNotes: "piso 72/7220; SkipCaracteristicas por padrão",
    cronKind: "proposed",
    cronExpression: "30 4 * * 1",
    cronJobName: "compras-catmat-7220",
    defaultBody: {
      codigo_grupo: 72,
      codigo_classe: 7220,
      incluir_caracteristicas: false,
      max_paginas: 500
    },
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 1,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-pca",
    functionName: "sync-pncp-pca",
    source: "PNCP PCA",
    tables: "pca_*, private.pncp_period_anchor",
    invokeScript: "scripts/invoke-sync-pca.ps1",
    gateNotes: "probe mensal vs carga; somente_verificacao / forcar / verificar_periodo",
    cronKind: "official_008",
    cronExpression: "0 2 1 * *",
    cronJobName: "pncp-pca-probe-mensal",
    defaultBody: { somente_verificacao: true, ano: (/* @__PURE__ */ new Date()).getUTCFullYear() },
    observeTimeoutMs: 30 * 60 * 1e3,
    pipelineOrder: 2,
    requiresApproval: true
  },
  {
    slug: "link-catmat-pca",
    functionName: "link-catmat-pca",
    source: "interno",
    tables: "catalogo_ponte, pca_item_pdm",
    invokeScript: "scripts/invoke-sync-licitagym-scope.ps1",
    gateNotes: "depois de CATMAT + PCA",
    cronKind: "proposed",
    cronExpression: "0 6 * * 1",
    cronJobName: "link-catmat-pca",
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1e3,
    pipelineOrder: 3,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-orgaos",
    functionName: "sync-pncp-orgaos",
    source: "PNCP integração / bootstrap PCA",
    tables: "entidades, orgaos, unidades",
    invokeScript: "scripts/invoke-sync-orgaos.ps1",
    gateNotes: "preferir bootstrap_pca se integração 5xx",
    cronKind: "proposed",
    cronExpression: "0 5 * * *",
    cronJobName: "pncp-orgaos-bootstrap",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 4,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-catalogo",
    functionName: "sync-pncp-catalogo",
    source: "PNCP integração",
    tables: "catálogo PNCP / ponte",
    invokeScript: null,
    gateNotes: "requer token integração",
    cronKind: "proposed",
    cronExpression: "30 5 * * *",
    cronJobName: "pncp-catalogo",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  },
  {
    slug: "sync-pncp-legislation",
    functionName: "sync-pncp-legislation",
    source: "scrape / PDF oficiais",
    tables: "legislação + Storage pncp-legislation",
    invokeScript: "scripts/invoke-sync-legislation.ps1",
    gateNotes: "só PDF; HTML→erro_importacao",
    cronKind: "official_008",
    cronExpression: "0 */6 * * *",
    cronJobName: "pncp-legislation-check",
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-editais",
    functionName: "sync-pncp-contratacoes-editais",
    source: "PNCP publicacao",
    tables: "editais / eventos",
    invokeScript: "scripts/invoke-sync-editais.ps1",
    gateNotes: "escopo catalogo + gate objeto fitness",
    cronKind: "official_008",
    cronExpression: "0 */6 * * *",
    cronJobName: "pncp-contratacoes-editais",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 5,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-atas",
    functionName: "sync-pncp-contratacoes-atas",
    source: "PNCP",
    tables: "atas",
    invokeScript: null,
    gateNotes: "cron offset +15 min",
    cronKind: "official_008",
    cronExpression: "15 */6 * * *",
    cronJobName: "pncp-contratacoes-atas",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-contratos",
    functionName: "sync-pncp-contratacoes-contratos",
    source: "PNCP",
    tables: "contratos",
    invokeScript: null,
    gateNotes: "cron offset +30 min",
    cronKind: "official_008",
    cronExpression: "30 */6 * * *",
    cronJobName: "pncp-contratacoes-contratos",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-irp",
    functionName: "sync-pncp-irp",
    source: "PNCP IRP",
    tables: "IRP",
    invokeScript: null,
    gateNotes: "só se IRP_SYNC_ENABLED=true",
    cronKind: "proposed",
    cronExpression: null,
    cronJobName: "pncp-irp",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  },
  {
    slug: "import-catmat-curadoria",
    functionName: "import-catmat-curadoria",
    source: "seed JSON",
    tables: "curadoria CATMAT",
    invokeScript: "scripts/import-catmat-curadoria.ps1",
    gateNotes: "manual / raro",
    cronKind: "manual",
    cronExpression: null,
    cronJobName: null,
    defaultBody: {},
    observeTimeoutMs: 10 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  }
];
function mapSyncStatusToColumn(status) {
  switch (status) {
    case "pendente":
    case "cancelada":
      return "backlog";
    case "executando":
      return "doing";
    case "concluida":
      return "done";
    case "concluida_com_erros":
    case "falhou":
      return "blocked";
    default:
      return "backlog";
  }
}
const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "doing", title: "Em andamento" },
  { id: "done", title: "Concluído" },
  { id: "blocked", title: "Blocked" }
];
const cards = ref([]);
const pipelineOrder = ref([]);
const loading = ref(true);
const error = ref(null);
const notice = ref(null);
let unsub = null;
function detailForItem(item) {
  return [
    `function: ${item.functionName}`,
    `fonte: ${item.source}`,
    `tabelas: ${item.tables}`,
    item.invokeScript ? `script: ${item.invokeScript}` : "script: —",
    item.cronJobName ? `cron: ${item.cronJobName} (${item.cronKind}) ${item.cronExpression ?? "—"}` : `cron: ${item.cronKind}`,
    `gate: ${item.gateNotes}`,
    `body: ${JSON.stringify(item.defaultBody)}`,
    item.pipelineOrder != null ? `pipeline #${item.pipelineOrder}` : "fora do pipeline escopo",
    item.requiresApproval ? "⚠️ requer aprovação admin para cron pesado" : ""
  ].filter(Boolean).join("\n");
}
async function seedBoard() {
  loading.value = true;
  error.value = null;
  try {
    const inv = await window.syncs.inventory();
    pipelineOrder.value = [...inv.pipelineOrder];
    const syncCards = inv.items.map((item) => ({
      id: `sync-${item.slug}`,
      title: item.slug,
      columnId: "backlog",
      agentName: `sync-agent-${item.slug.replace(/^sync-/, "")}`,
      agentSlug: item.slug,
      specName: "ini-04-spec-syncs",
      executionDetail: detailForItem(item),
      slug: item.slug,
      cronExpression: item.cronExpression,
      bodyJson: JSON.stringify(item.defaultBody, null, 2),
      kind: "sync",
      expanded: item.slug === "sync-compras-catmat"
    }));
    const setupCards = inv.setupCards.map((s) => ({
      id: s.id,
      title: s.title,
      columnId: "backlog",
      agentName: "Setup Agent",
      agentSlug: "setup",
      specName: "ini-04-spec-syncs",
      executionDetail: s.detail,
      kind: "setup"
    }));
    const pipelineCard = {
      id: "pipeline-licitagym-scope",
      title: "Pipeline invoke-sync-licitagym-scope",
      columnId: "backlog",
      agentName: "Pipeline Agent",
      agentSlug: "pipeline",
      specName: "ini-04-spec-syncs",
      executionDetail: [
        "Ordem obrigatória (não pular):",
        ...inv.pipelineOrder.map((s, i) => `${i + 1}. ${s}`),
        "Falha em N → blocked; não dispara N+1."
      ].join("\n"),
      kind: "pipeline",
      expanded: true
    };
    cards.value = [...setupCards, pipelineCard, ...syncCards];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Falha ao carregar inventário";
  } finally {
    loading.value = false;
  }
}
const cardsByColumn = computed(() => {
  const map = {
    backlog: [],
    doing: [],
    done: [],
    blocked: []
  };
  for (const c of cards.value) map[c.columnId].push(c);
  return map;
});
function toggleExpand(id) {
  const c = cards.value.find((x) => x.id === id);
  if (c) c.expanded = !c.expanded;
}
function applyRunEvent(event) {
  const target = cards.value.find((c) => c.syncId === event.sync_id) ?? cards.value.find(
    (c) => c.kind === "sync" && c.columnId === "doing" && (c.slug === event.resource_type || c.slug?.includes(event.resource_type) || event.resource_type.includes(c.slug?.replace(/^sync-/, "") ?? ""))
  );
  if (!target) return;
  target.syncId = event.sync_id;
  target.lastStatus = event.status;
  target.totalsText = `recebidos=${event.totals.recebidos} novos=${event.totals.novos} alterados=${event.totals.alterados} inalterados=${event.totals.inalterados} erros=${event.totals.erros}`;
  target.columnId = mapSyncStatusToColumn(event.status);
  target.invoking = event.status === "executando" || event.status === "pendente";
  if (event.erro_principal) {
    target.error = event.erro_principal;
    target.executionDetail = `${target.executionDetail.split("\n---\n")[0]}
---
sync_id=${event.sync_id}
status=${event.status}
${target.totalsText}
erro=${event.erro_principal}`;
  } else {
    target.error = null;
    target.executionDetail = `${target.executionDetail.split("\n---\n")[0]}
---
sync_id=${event.sync_id}
status=${event.status}
${target.totalsText}`;
  }
}
async function invokeSync(cardId) {
  const card = cards.value.find((c) => c.id === cardId);
  if (!card?.slug) return;
  notice.value = null;
  error.value = null;
  card.invoking = true;
  card.error = null;
  card.columnId = "doing";
  try {
    const result = await window.syncs.invoke({ slug: card.slug, watch: true });
    card.syncId = result.sync_id;
    card.lastStatus = result.status;
    card.columnId = mapSyncStatusToColumn(result.status);
    notice.value = result.alreadyRunning ? `Lock ativo — observando sync_id=${result.sync_id} (sem re-POST)` : `Invoke OK — sync_id=${result.sync_id ?? "—"} status=${result.status}`;
    if (!result.sync_id && result.status !== "concluida") {
      card.columnId = "blocked";
      card.error = "Resposta sem sync_id — não inventar conclusão";
    }
  } catch (e) {
    card.columnId = "blocked";
    card.error = e instanceof Error ? e.message : "Falha no invoke";
    card.invoking = false;
  }
}
function useSyncsScript() {
  onMounted(() => {
    void seedBoard();
    unsub = window.syncs.onRunUpdated((event) => applyRunEvent(event));
  });
  onUnmounted(() => {
    unsub?.();
    unsub = null;
  });
  return {
    columns,
    cards,
    cardsByColumn,
    loading,
    error,
    notice,
    pipelineOrder,
    toggleExpand,
    invokeSync,
    seedBoard
  };
}
const _hoisted_1$2 = { class: "syncs" };
const _hoisted_2$2 = { class: "syncs__header" };
const _hoisted_3$2 = { class: "flex items-center gap-2" };
const _hoisted_4$2 = {
  key: 0,
  class: "syncs__banner"
};
const _hoisted_5$2 = {
  key: 1,
  class: "syncs__banner syncs__banner--err",
  role: "alert"
};
const _hoisted_6$2 = {
  key: 2,
  class: "syncs__banner syncs__banner--ok"
};
const _hoisted_7$2 = { class: "syncs__board" };
const _hoisted_8$1 = { class: "syncs__column-head" };
const _hoisted_9 = { class: "syncs__cards" };
const _hoisted_10 = { class: "syncs__card-title" };
const _hoisted_11 = { class: "syncs__card-meta" };
const _hoisted_12 = { key: 0 };
const _hoisted_13 = { class: "syncs__card-actions" };
const _hoisted_14 = {
  key: 0,
  class: "syncs__banner syncs__banner--err"
};
const _hoisted_15 = {
  key: 1,
  class: "syncs__card-detail"
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "syncs.layout",
  setup(__props) {
    const {
      columns: columns2,
      cardsByColumn: cardsByColumn2,
      loading: loading2,
      error: error2,
      notice: notice2,
      toggleExpand: toggleExpand2,
      invokeSync: invokeSync2,
      seedBoard: seedBoard2
    } = useSyncsScript();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", _hoisted_1$2, [
        createBaseVNode("header", _hoisted_2$2, [
          _cache[2] || (_cache[2] = createBaseVNode("h2", { class: "syncs__title" }, "Syncs · ini-04", -1)),
          createBaseVNode("div", _hoisted_3$2, [
            createVNode(unref(_sfc_main$6), { variant: "outline" }, {
              default: withCtx(() => [..._cache[0] || (_cache[0] = [
                createTextVNode("polling MVP 5s", -1)
              ])]),
              _: 1
            }),
            createVNode(unref(_sfc_main$7), {
              size: "sm",
              variant: "ghost",
              onClick: unref(seedBoard2)
            }, {
              default: withCtx(() => [..._cache[1] || (_cache[1] = [
                createTextVNode("Re-seed", -1)
              ])]),
              _: 1
            }, 8, ["onClick"])
          ])
        ]),
        unref(loading2) ? (openBlock(), createElementBlock("p", _hoisted_4$2, "Carregando inventário…")) : unref(error2) ? (openBlock(), createElementBlock("p", _hoisted_5$2, toDisplayString(unref(error2)), 1)) : createCommentVNode("", true),
        unref(notice2) ? (openBlock(), createElementBlock("p", _hoisted_6$2, toDisplayString(unref(notice2)), 1)) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_7$2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(columns2), (col) => {
            return openBlock(), createElementBlock("div", {
              key: col.id,
              class: normalizeClass(["syncs__column", { "syncs__column--blocked": col.id === "blocked" }])
            }, [
              createBaseVNode("div", _hoisted_8$1, [
                createBaseVNode("span", null, toDisplayString(col.title), 1),
                createVNode(unref(_sfc_main$6), { variant: "secondary" }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(cardsByColumn2)[col.id].length), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              createBaseVNode("div", _hoisted_9, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(cardsByColumn2)[col.id], (card) => {
                  return openBlock(), createElementBlock("article", {
                    key: card.id,
                    class: "syncs__card"
                  }, [
                    createBaseVNode("p", _hoisted_10, toDisplayString(card.title), 1),
                    createBaseVNode("div", _hoisted_11, [
                      createVNode(unref(_sfc_main$6), { variant: "secondary" }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(card.agentName), 1)
                        ]),
                        _: 2
                      }, 1024),
                      createVNode(unref(_sfc_main$6), { variant: "outline" }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(card.kind), 1)
                        ]),
                        _: 2
                      }, 1024),
                      createBaseVNode("span", null, toDisplayString(card.specName), 1),
                      card.lastStatus ? (openBlock(), createElementBlock("span", _hoisted_12, "status=" + toDisplayString(card.lastStatus), 1)) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("div", _hoisted_13, [
                      createVNode(unref(_sfc_main$7), {
                        size: "sm",
                        variant: "ghost",
                        onClick: ($event) => unref(toggleExpand2)(card.id)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(card.expanded ? "Ocultar" : "Detalhe"), 1)
                        ]),
                        _: 2
                      }, 1032, ["onClick"]),
                      card.kind === "sync" && card.slug ? (openBlock(), createBlock(unref(_sfc_main$7), {
                        key: 0,
                        size: "sm",
                        variant: "outline",
                        disabled: card.invoking,
                        onClick: ($event) => unref(invokeSync2)(card.id)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(card.invoking ? "Observando…" : "Invoke"), 1)
                        ]),
                        _: 2
                      }, 1032, ["disabled", "onClick"])) : createCommentVNode("", true)
                    ]),
                    card.error ? (openBlock(), createElementBlock("p", _hoisted_14, toDisplayString(card.error), 1)) : createCommentVNode("", true),
                    card.expanded ? (openBlock(), createElementBlock("p", _hoisted_15, toDisplayString(card.executionDetail), 1)) : createCommentVNode("", true)
                  ]);
                }), 128))
              ])
            ], 2);
          }), 128))
        ])
      ]);
    };
  }
});
const SyncsLayout = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-71dbd30c"]]);
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
function isDefined(value) {
  return value !== null && value !== void 0;
}
function buildLucideIconNode(icon, params = {}) {
  const attributeNames = params.attributeNames ?? {};
  const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
  const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
  const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
  const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
  const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
  const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
  const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
  const calculatedStrokeWidth = params.absoluteStrokeWidth ? Number(params.strokeWidth ?? defaultAttributes["stroke-width"]) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]) : params.strokeWidth ?? defaultAttributes["stroke-width"];
  const attributes = {
    ...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
      attrs[getAttributeName(attrName)] = value;
      return attrs;
    }, {}),
    ..."color" in params && params.color && {
      [getAttributeName("stroke")]: params.color
    },
    ..."size" in params && isDefined(params.size) && {
      [getAttributeName("width")]: params.size,
      [getAttributeName("height")]: params.size
    },
    ..."width" in params && isDefined(params.width) && {
      [getAttributeName("width")]: params.width
    },
    ..."height" in params && isDefined(params.height) && {
      [getAttributeName("height")]: params.height
    },
    [getAttributeName("stroke-width")]: calculatedStrokeWidth,
    ...className && {
      [getAttributeName("class")]: className
    },
    [getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
    ...params.hasA11yProp === false ? {
      [getAttributeName("aria-hidden")]: "true"
    } : {},
    ..."attributes" in params && params.attributes
  };
  return [
    "svg",
    attributes,
    icon.node.map((child) => {
      const [name, attrs, children] = child;
      const nextAttrs = params.nonScalingStroke ? { [getAttributeName("vector-effect")]: "non-scaling-stroke", ...attrs } : attrs;
      return children ? [name, nextAttrs, children] : [name, nextAttrs];
    })
  ];
}
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const isEmptyString = (value) => value === "";
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const toKebabCase = (string) => string?.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LUCIDE_CONTEXT = /* @__PURE__ */ Symbol("lucide-icons");
function useLucideProps() {
  return inject(LUCIDE_CONTEXT, {});
}
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Icon = ({
  name,
  iconNode,
  "icon-node": iconNodeKebabCase,
  icon = {
    name: toKebabCase(name),
    node: iconNode ?? iconNodeKebabCase,
    size: 24,
    aliases: []
  },
  absoluteStrokeWidth,
  "absolute-stroke-width": absoluteStrokeWidthKebabCase,
  nonScalingStroke,
  "non-scaling-stroke": nonScalingStrokeKebabCase,
  strokeWidth,
  "stroke-width": strokeWidthKebabCase,
  size,
  width = size,
  height = size,
  color,
  ...props
}, { slots }) => {
  const {
    size: contextSize,
    color: contextColor,
    strokeWidth: contextStrokeWidth = 2,
    absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
    nonScalingStroke: contextNonScalingStroke = false,
    class: contextClass = ""
  } = useLucideProps();
  const isAbsoluteStrokeWidth = isEmptyString(absoluteStrokeWidth) || isEmptyString(absoluteStrokeWidthKebabCase) || absoluteStrokeWidth === true || absoluteStrokeWidthKebabCase === true || contextAbsoluteStrokeWidth === true;
  const isNonScalingStroke = isEmptyString(nonScalingStroke) || isEmptyString(nonScalingStrokeKebabCase) || nonScalingStroke === true || nonScalingStrokeKebabCase === true || contextNonScalingStroke === true;
  delete props.class;
  const defaultSlot = slots.default?.();
  const [, svgAttributes, builtIconNode = []] = buildLucideIconNode(icon, {
    color: color ?? contextColor,
    width: width ?? size ?? contextSize,
    height: height ?? size ?? contextSize,
    strokeWidth: strokeWidth ?? strokeWidthKebabCase ?? contextStrokeWidth,
    absoluteStrokeWidth: isAbsoluteStrokeWidth,
    nonScalingStroke: isNonScalingStroke,
    className: contextClass,
    hasA11yProp: defaultSlot != null && defaultSlot.length > 0 || hasA11yProp(props),
    attributes: props
  });
  return h("svg", svgAttributes, [
    ...builtIconNode.map((child) => h(...child)),
    ...defaultSlot ?? []
  ]);
};
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
function createLucideIcon(iconDataOrName, iconNode = []) {
  const icon = typeof iconDataOrName === "string" ? {
    name: iconDataOrName,
    node: iconNode
  } : iconDataOrName;
  return (props, { slots }) => h(
    Icon,
    {
      ...props,
      icon
    },
    slots.default ? { default: slots.default } : void 0
  );
}
/**
 * @license @lucide/vue v1.47.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconData = {
  name: "bell",
  size: 24,
  node: [
    ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
    [
      "path",
      {
        d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
        key: "11g9vi"
      }
    ]
  ]
};
const Bell = createLucideIcon(__iconData);
const useAlertsStore = defineStore("alerts", () => {
  const items = ref([]);
  const open = ref(false);
  let unsubscribe = null;
  const unread = computed(() => items.value.filter((i) => !i.read && i.channel === "bell").length);
  async function bootstrap() {
    if (!window.alerts) return;
    items.value = await window.alerts.list();
    unsubscribe?.();
    unsubscribe = window.alerts.onPush((item) => {
      items.value = [item, ...items.value.filter((i) => i.id !== item.id)];
      if (item.channel === "bell") open.value = true;
    });
  }
  async function markRead(id) {
    await window.alerts.markRead(id);
    const item = items.value.find((i) => i.id === id);
    if (item) item.read = true;
  }
  function toggle() {
    open.value = !open.value;
  }
  return { items, open, unread, bootstrap, markRead, toggle };
});
const _hoisted_1$1 = { class: "relative" };
const _hoisted_2$1 = {
  key: 0,
  class: "absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-card p-2 shadow-md"
};
const _hoisted_3$1 = {
  key: 0,
  class: "px-2 py-3 text-sm text-muted-foreground"
};
const _hoisted_4$1 = ["onClick"];
const _hoisted_5$1 = { class: "text-sm font-medium" };
const _hoisted_6$1 = { class: "text-xs text-muted-foreground" };
const _hoisted_7$1 = { class: "text-[10px] text-muted-foreground" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "AlertBell",
  setup(__props) {
    const alerts = useAlertsStore();
    onMounted(() => {
      void alerts.bootstrap();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createVNode(unref(_sfc_main$7), {
          variant: "ghost",
          size: "icon",
          "aria-label": "Alertas",
          onClick: _cache[0] || (_cache[0] = ($event) => unref(alerts).toggle())
        }, {
          default: withCtx(() => [
            createVNode(unref(Bell)),
            unref(alerts).unread > 0 ? (openBlock(), createBlock(unref(_sfc_main$6), {
              key: 0,
              class: "absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(alerts).unread), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        unref(alerts).open ? (openBlock(), createElementBlock("div", _hoisted_2$1, [
          _cache[1] || (_cache[1] = createBaseVNode("p", { class: "px-2 py-1 text-xs font-semibold text-muted-foreground" }, "Alertas", -1)),
          unref(alerts).items.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_3$1, " Nenhum alerta. ")) : createCommentVNode("", true),
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(alerts).items.slice(0, 8), (item) => {
            return openBlock(), createElementBlock("button", {
              key: item.id,
              type: "button",
              class: "flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left hover:bg-accent",
              onClick: ($event) => unref(alerts).markRead(item.id)
            }, [
              createBaseVNode("span", _hoisted_5$1, toDisplayString(item.title), 1),
              createBaseVNode("span", _hoisted_6$1, toDisplayString(item.body), 1),
              createBaseVNode("span", _hoisted_7$1, toDisplayString(item.channel) + " · " + toDisplayString(new Date(item.createdAt).toLocaleString("pt-BR")), 1)
            ], 8, _hoisted_4$1);
          }), 128))
        ])) : createCommentVNode("", true)
      ]);
    };
  }
});
function useHarnessScript() {
  return {
    title: "Kuib Harness"
  };
}
const _hoisted_1 = { class: "harness" };
const _hoisted_2 = { class: "harness__topbar" };
const _hoisted_3 = { class: "harness__brand" };
const _hoisted_4 = { class: "flex items-center gap-2" };
const _hoisted_5 = { class: "text-sm text-muted-foreground" };
const _hoisted_6 = { class: "harness__body" };
const _hoisted_7 = { class: "harness__chat" };
const _hoisted_8 = { class: "harness__kanban" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "harness.layout",
  setup(__props) {
    const { title } = useHarnessScript();
    const auth = useAuthStore();
    const router = useRouter();
    async function onSignOut() {
      await auth.signOut();
      await router.replace({ name: "login" });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          createBaseVNode("h1", _hoisted_3, toDisplayString(unref(title)), 1),
          createBaseVNode("div", _hoisted_4, [
            createBaseVNode("span", _hoisted_5, toDisplayString(unref(auth).user?.email), 1),
            createVNode(unref(_sfc_main$6), { variant: "secondary" }, {
              default: withCtx(() => [..._cache[0] || (_cache[0] = [
                createTextVNode("ini-04 syncs", -1)
              ])]),
              _: 1
            }),
            createVNode(unref(RouterLink), { to: "/providers" }, {
              default: withCtx(() => [
                createVNode(unref(_sfc_main$7), {
                  size: "sm",
                  variant: "outline"
                }, {
                  default: withCtx(() => [..._cache[1] || (_cache[1] = [
                    createTextVNode("Providers", -1)
                  ])]),
                  _: 1
                })
              ]),
              _: 1
            }),
            createVNode(_sfc_main$1),
            createVNode(unref(_sfc_main$7), {
              size: "sm",
              variant: "ghost",
              onClick: onSignOut
            }, {
              default: withCtx(() => [..._cache[2] || (_cache[2] = [
                createTextVNode("Sair", -1)
              ])]),
              _: 1
            })
          ])
        ]),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("aside", _hoisted_7, [
            createVNode(ChatLayout)
          ]),
          createBaseVNode("main", _hoisted_8, [
            createVNode(SyncsLayout)
          ])
        ])
      ]);
    };
  }
});
const harness_layout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-852aeff7"]]);
export {
  harness_layout as default
};
