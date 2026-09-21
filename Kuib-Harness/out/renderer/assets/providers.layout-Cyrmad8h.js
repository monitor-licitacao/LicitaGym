import { d as defineComponent, c as createElementBlock, n as normalizeClass, u as unref, o as openBlock, l as onMounted, e as computed, b as ref, A as reactive, a as createBaseVNode, f as createVNode, w as withCtx, R as RouterLink, t as toDisplayString, p as createCommentVNode, F as Fragment, h as renderList, g as createTextVNode, B as withDirectives, C as vModelSelect, D as vModelCheckbox, k as isRef, q as createBlock } from "./index-BsLBVoAX.js";
import { _ as _sfc_main$4 } from "./Badge.vue_vue_type_script_setup_true_lang-BF7c0FOf.js";
import { c as cn, _ as _sfc_main$3 } from "./index-1pL5IT2O.js";
import { _ as _sfc_main$2 } from "./Input.vue_vue_type_script_setup_true_lang-B9eBaS63.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "Separator",
  props: {
    class: { type: [Boolean, null, String, Object, Array] },
    orientation: {}
  },
  setup(__props) {
    const props = __props;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        role: "separator",
        class: normalizeClass(
          unref(cn)(
            "shrink-0 bg-border",
            (props.orientation ?? "horizontal") === "horizontal" ? "h-px w-full" : "h-full w-px",
            props.class
          )
        )
      }, null, 2);
    };
  }
});
const catalog = ref([]);
const connectors = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const notice = ref(null);
const form = reactive({
  slug: "anthropic",
  label: "Anthropic principal",
  authMode: "api_key",
  baseUrl: "",
  apiKey: "",
  modelId: "claude-sonnet-4-20250514",
  enabled: true
});
const alertConfig = ref(null);
const resendApiKey = ref("");
const evolutionApiKey = ref("");
const wppconnectToken = ref("");
const selectedDef = computed(() => catalog.value.find((p) => p.slug === form.slug));
const modelsForSlug = computed(() => selectedDef.value?.models ?? []);
function resetFormForSlug(slug) {
  const def = catalog.value.find((p) => p.slug === slug);
  if (!def) return;
  form.slug = slug;
  form.label = `${def.name} principal`;
  form.authMode = def.authModes[0];
  form.baseUrl = def.defaultBaseUrl ?? "";
  form.apiKey = "";
  form.modelId = def.models.find((m) => m.traditional)?.id ?? def.models[0]?.id ?? "";
  form.enabled = true;
  form.id = void 0;
}
async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [cat, list, cfg] = await Promise.all([
      window.providers.catalog(),
      window.providers.list(),
      window.alerts.getConfig()
    ]);
    catalog.value = cat;
    connectors.value = list;
    alertConfig.value = cfg;
    if (!form.modelId && cat[0]) resetFormForSlug(cat[0].slug);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Falha ao carregar providers";
  } finally {
    loading.value = false;
  }
}
async function saveConnector() {
  saving.value = true;
  error.value = null;
  notice.value = null;
  try {
    const saved = await window.providers.upsert({
      ...form,
      apiKey: form.apiKey?.trim() || void 0,
      baseUrl: form.baseUrl?.trim() || void 0
    });
    connectors.value = await window.providers.list();
    notice.value = `Conector "${saved.label}" salvo (${saved.slug}/${saved.modelId})`;
    form.apiKey = "";
    form.id = saved.id;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Falha ao salvar";
  } finally {
    saving.value = false;
  }
}
function editConnector(c) {
  form.id = c.id;
  form.slug = c.slug;
  form.label = c.label;
  form.authMode = c.authMode;
  form.baseUrl = c.baseUrl ?? "";
  form.apiKey = "";
  form.modelId = c.modelId;
  form.enabled = c.enabled;
}
async function removeConnector(id) {
  await window.providers.delete(id);
  connectors.value = await window.providers.list();
}
async function saveAlerts() {
  if (!alertConfig.value) return;
  saving.value = true;
  try {
    alertConfig.value = await window.alerts.setConfig({
      resend: alertConfig.value.resend,
      whatsapp: alertConfig.value.whatsapp,
      realtime: alertConfig.value.realtime,
      resendApiKey: resendApiKey.value || void 0,
      evolutionApiKey: evolutionApiKey.value || void 0,
      wppconnectToken: wppconnectToken.value || void 0
    });
    resendApiKey.value = "";
    evolutionApiKey.value = "";
    wppconnectToken.value = "";
    notice.value = "Automações de alerta salvas";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Falha ao salvar alertas";
  } finally {
    saving.value = false;
  }
}
function authLabel(mode) {
  if (mode === "api_key") return "API Key";
  if (mode === "oauth_plan") return "Auth (plano ativo)";
  return "URL + API Key (OpenCode)";
}
function useProvidersScript() {
  onMounted(() => {
    void load();
  });
  return {
    catalog,
    connectors,
    loading,
    saving,
    error,
    notice,
    form,
    alertConfig,
    resendApiKey,
    evolutionApiKey,
    wppconnectToken,
    selectedDef,
    modelsForSlug,
    resetFormForSlug,
    saveConnector,
    editConnector,
    removeConnector,
    saveAlerts,
    authLabel,
    load
  };
}
const _hoisted_1 = { class: "providers" };
const _hoisted_2 = { class: "providers__header" };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = {
  key: 1,
  class: "providers__alert",
  role: "alert"
};
const _hoisted_5 = {
  key: 2,
  class: "providers__notice"
};
const _hoisted_6 = {
  key: 3,
  class: "providers__grid"
};
const _hoisted_7 = { class: "providers__panel" };
const _hoisted_8 = { class: "providers__slugs" };
const _hoisted_9 = { class: "providers__fields" };
const _hoisted_10 = ["value"];
const _hoisted_11 = { key: 0 };
const _hoisted_12 = { key: 1 };
const _hoisted_13 = { key: 2 };
const _hoisted_14 = ["value"];
const _hoisted_15 = { class: "flex-row items-center gap-2 !flex-row" };
const _hoisted_16 = { class: "providers__panel" };
const _hoisted_17 = {
  key: 0,
  class: "text-sm text-muted-foreground"
};
const _hoisted_18 = { class: "providers__list" };
const _hoisted_19 = { class: "providers__item-actions" };
const _hoisted_20 = {
  key: 4,
  class: "providers__panel"
};
const _hoisted_21 = { class: "providers__fields" };
const _hoisted_22 = { class: "!flex-row items-center gap-2" };
const _hoisted_23 = { class: "!flex-row items-center gap-2" };
const _hoisted_24 = { class: "!flex-row items-center gap-2" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "providers.layout",
  setup(__props) {
    const {
      catalog: catalog2,
      connectors: connectors2,
      loading: loading2,
      saving: saving2,
      error: error2,
      notice: notice2,
      form: form2,
      alertConfig: alertConfig2,
      resendApiKey: resendApiKey2,
      evolutionApiKey: evolutionApiKey2,
      wppconnectToken: wppconnectToken2,
      selectedDef: selectedDef2,
      modelsForSlug: modelsForSlug2,
      resetFormForSlug: resetFormForSlug2,
      saveConnector: saveConnector2,
      editConnector: editConnector2,
      removeConnector: removeConnector2,
      saveAlerts: saveAlerts2,
      authLabel: authLabel2
    } = useProvidersScript();
    function onSlugClick(slug) {
      resetFormForSlug2(slug);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[19] || (_cache[19] = createBaseVNode("div", null, [
            createBaseVNode("h1", null, "Conectores de provider"),
            createBaseVNode("p", null, "Anthropic, Gemini, OpenAI, Ollama e OpenCode — gate de modelo por slug.")
          ], -1)),
          createVNode(unref(RouterLink), { to: "/" }, {
            default: withCtx(() => [
              createVNode(unref(_sfc_main$3), { variant: "outline" }, {
                default: withCtx(() => [..._cache[18] || (_cache[18] = [
                  createTextVNode("Voltar ao harness", -1)
                ])]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        unref(loading2) ? (openBlock(), createElementBlock("p", _hoisted_3, "Carregando…")) : unref(error2) ? (openBlock(), createElementBlock("p", _hoisted_4, toDisplayString(unref(error2)), 1)) : createCommentVNode("", true),
        unref(notice2) ? (openBlock(), createElementBlock("p", _hoisted_5, toDisplayString(unref(notice2)), 1)) : createCommentVNode("", true),
        !unref(loading2) ? (openBlock(), createElementBlock("div", _hoisted_6, [
          createBaseVNode("div", _hoisted_7, [
            _cache[25] || (_cache[25] = createBaseVNode("h2", null, "Novo / editar conector", -1)),
            createBaseVNode("div", _hoisted_8, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(catalog2), (p) => {
                return openBlock(), createBlock(unref(_sfc_main$3), {
                  key: p.slug,
                  size: "sm",
                  variant: unref(form2).slug === p.slug ? "default" : "outline",
                  onClick: ($event) => onSlugClick(p.slug)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(p.name), 1)
                  ]),
                  _: 2
                }, 1032, ["variant", "onClick"]);
              }), 128))
            ]),
            createBaseVNode("div", _hoisted_9, [
              createBaseVNode("label", null, [
                _cache[20] || (_cache[20] = createTextVNode(" Label ", -1)),
                createVNode(unref(_sfc_main$2), {
                  modelValue: unref(form2).label,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(form2).label = $event)
                }, null, 8, ["modelValue"])
              ]),
              createBaseVNode("label", null, [
                _cache[21] || (_cache[21] = createTextVNode(" Modo de autenticação ", -1)),
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(form2).authMode = $event),
                  class: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(selectedDef2)?.authModes ?? [], (mode) => {
                    return openBlock(), createElementBlock("option", {
                      key: mode,
                      value: mode
                    }, toDisplayString(unref(authLabel2)(mode)), 9, _hoisted_10);
                  }), 128))
                ], 512), [
                  [vModelSelect, unref(form2).authMode]
                ])
              ]),
              unref(form2).authMode === "url_key" || unref(form2).slug === "ollama" || unref(form2).slug === "opencode" ? (openBlock(), createElementBlock("label", _hoisted_11, [
                _cache[22] || (_cache[22] = createTextVNode(" Base URL ", -1)),
                createVNode(unref(_sfc_main$2), {
                  modelValue: unref(form2).baseUrl,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(form2).baseUrl = $event),
                  placeholder: "http://127.0.0.1:11434"
                }, null, 8, ["modelValue"])
              ])) : createCommentVNode("", true),
              unref(form2).authMode !== "oauth_plan" ? (openBlock(), createElementBlock("label", _hoisted_12, [
                createTextVNode(" API Key " + toDisplayString(unref(form2).id ? "(deixe vazio para manter)" : "") + " ", 1),
                createVNode(unref(_sfc_main$2), {
                  modelValue: unref(form2).apiKey,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(form2).apiKey = $event),
                  type: "password",
                  autocomplete: "off"
                }, null, 8, ["modelValue"])
              ])) : (openBlock(), createElementBlock("label", _hoisted_13, [..._cache[23] || (_cache[23] = [
                createTextVNode(" Auth por plano ", -1),
                createBaseVNode("span", { class: "text-xs text-muted-foreground" }, " Fluxo OAuth / plano ativo — stub montado; API key não é exigida aqui. ", -1)
              ])])),
              createBaseVNode("label", null, [
                createTextVNode(" Modelo (gate por slug " + toDisplayString(unref(form2).slug) + ") ", 1),
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(form2).modelId = $event),
                  class: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(modelsForSlug2), (m) => {
                    return openBlock(), createElementBlock("option", {
                      key: m.id,
                      value: m.id
                    }, toDisplayString(m.label) + " · " + toDisplayString(m.kind) + toDisplayString(m.traditional ? " · tradicional" : ""), 9, _hoisted_14);
                  }), 128))
                ], 512), [
                  [vModelSelect, unref(form2).modelId]
                ])
              ]),
              createBaseVNode("label", _hoisted_15, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(form2).enabled = $event),
                  type: "checkbox"
                }, null, 512), [
                  [vModelCheckbox, unref(form2).enabled]
                ]),
                _cache[24] || (_cache[24] = createTextVNode(" Ativo ", -1))
              ])
            ]),
            createVNode(unref(_sfc_main$3), {
              disabled: unref(saving2),
              onClick: unref(saveConnector2)
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(saving2) ? "Salvando…" : "Salvar conector"), 1)
              ]),
              _: 1
            }, 8, ["disabled", "onClick"])
          ]),
          createBaseVNode("div", _hoisted_16, [
            _cache[28] || (_cache[28] = createBaseVNode("h2", null, "Conectores salvos", -1)),
            unref(connectors2).length === 0 ? (openBlock(), createElementBlock("p", _hoisted_17, " Nenhum conector ainda. ")) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_18, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(connectors2), (c) => {
                return openBlock(), createElementBlock("div", {
                  key: c.id,
                  class: "providers__item"
                }, [
                  createBaseVNode("div", null, [
                    createBaseVNode("strong", null, toDisplayString(c.label), 1),
                    createBaseVNode("span", null, [
                      createTextVNode(toDisplayString(c.slug) + " · " + toDisplayString(c.modelId) + " ", 1),
                      createVNode(unref(_sfc_main$4), {
                        variant: "secondary",
                        class: "ml-1"
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(c.authMode), 1)
                        ]),
                        _: 2
                      }, 1024),
                      c.apiKeyMasked ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createTextVNode(" · " + toDisplayString(c.apiKeyMasked), 1)
                      ], 64)) : createCommentVNode("", true)
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_19, [
                    createVNode(unref(_sfc_main$3), {
                      size: "sm",
                      variant: "outline",
                      onClick: ($event) => unref(editConnector2)(c)
                    }, {
                      default: withCtx(() => [..._cache[26] || (_cache[26] = [
                        createTextVNode("Editar", -1)
                      ])]),
                      _: 1
                    }, 8, ["onClick"]),
                    createVNode(unref(_sfc_main$3), {
                      size: "sm",
                      variant: "ghost",
                      onClick: ($event) => unref(removeConnector2)(c.id)
                    }, {
                      default: withCtx(() => [..._cache[27] || (_cache[27] = [
                        createTextVNode("Remover", -1)
                      ])]),
                      _: 1
                    }, 8, ["onClick"])
                  ])
                ]);
              }), 128))
            ])
          ])
        ])) : createCommentVNode("", true),
        createVNode(unref(_sfc_main$1)),
        unref(alertConfig2) ? (openBlock(), createElementBlock("div", _hoisted_20, [
          _cache[42] || (_cache[42] = createBaseVNode("h2", null, "Automações de alerta (fim de Spec / card done)", -1)),
          createBaseVNode("div", _hoisted_21, [
            createBaseVNode("label", _hoisted_22, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => unref(alertConfig2).resend.enabled = $event),
                type: "checkbox"
              }, null, 512), [
                [vModelCheckbox, unref(alertConfig2).resend.enabled]
              ]),
              _cache[29] || (_cache[29] = createTextVNode(" E-mail via Resend ", -1))
            ]),
            createBaseVNode("label", null, [
              _cache[30] || (_cache[30] = createTextVNode(" From ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(alertConfig2).resend.from,
                "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => unref(alertConfig2).resend.from = $event)
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              _cache[31] || (_cache[31] = createTextVNode(" To (admin) ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(alertConfig2).resend.toAdmin,
                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref(alertConfig2).resend.toAdmin = $event),
                type: "email"
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              createTextVNode(" Resend API Key " + toDisplayString(unref(alertConfig2).resend.apiKeyConfigured ? "(configurada)" : "") + " ", 1),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(resendApiKey2),
                "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => isRef(resendApiKey2) ? resendApiKey2.value = $event : null),
                type: "password",
                autocomplete: "off"
              }, null, 8, ["modelValue"])
            ]),
            createVNode(unref(_sfc_main$1)),
            createBaseVNode("label", _hoisted_23, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(alertConfig2).whatsapp.enabled = $event),
                type: "checkbox"
              }, null, 512), [
                [vModelCheckbox, unref(alertConfig2).whatsapp.enabled]
              ]),
              _cache[32] || (_cache[32] = createTextVNode(" WhatsApp (Evolution / WPPConnect) ", -1))
            ]),
            createBaseVNode("label", null, [
              _cache[34] || (_cache[34] = createTextVNode(" Provider WhatsApp ", -1)),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(alertConfig2).whatsapp.provider = $event),
                class: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              }, [..._cache[33] || (_cache[33] = [
                createBaseVNode("option", { value: null }, "—", -1),
                createBaseVNode("option", { value: "evolution" }, "Evolution API", -1),
                createBaseVNode("option", { value: "wppconnect" }, "WPPConnect", -1)
              ])], 512), [
                [vModelSelect, unref(alertConfig2).whatsapp.provider]
              ])
            ]),
            createBaseVNode("label", null, [
              _cache[35] || (_cache[35] = createTextVNode(" Evolution base URL ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(alertConfig2).whatsapp.evolutionBaseUrl,
                "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref(alertConfig2).whatsapp.evolutionBaseUrl = $event)
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              _cache[36] || (_cache[36] = createTextVNode(" Evolution instance ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(alertConfig2).whatsapp.evolutionInstance,
                "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => unref(alertConfig2).whatsapp.evolutionInstance = $event)
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              _cache[37] || (_cache[37] = createTextVNode(" Evolution API Key ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(evolutionApiKey2),
                "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => isRef(evolutionApiKey2) ? evolutionApiKey2.value = $event : null),
                type: "password",
                autocomplete: "off"
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              _cache[38] || (_cache[38] = createTextVNode(" WPPConnect base URL ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(alertConfig2).whatsapp.wppconnectBaseUrl,
                "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => unref(alertConfig2).whatsapp.wppconnectBaseUrl = $event)
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("label", null, [
              _cache[39] || (_cache[39] = createTextVNode(" WPPConnect token ", -1)),
              createVNode(unref(_sfc_main$2), {
                modelValue: unref(wppconnectToken2),
                "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => isRef(wppconnectToken2) ? wppconnectToken2.value = $event : null),
                type: "password",
                autocomplete: "off"
              }, null, 8, ["modelValue"])
            ]),
            createVNode(unref(_sfc_main$1)),
            createBaseVNode("label", _hoisted_24, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => unref(alertConfig2).realtime.enabled = $event),
                type: "checkbox"
              }, null, 512), [
                [vModelCheckbox, unref(alertConfig2).realtime.enabled]
              ]),
              _cache[40] || (_cache[40] = createTextVNode(" Realtime após movimentação de cards ", -1))
            ])
          ]),
          createVNode(unref(_sfc_main$3), {
            disabled: unref(saving2),
            onClick: unref(saveAlerts2)
          }, {
            default: withCtx(() => [..._cache[41] || (_cache[41] = [
              createTextVNode("Salvar automações", -1)
            ])]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ])) : createCommentVNode("", true)
      ]);
    };
  }
});
const providers_layout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2ca4b60f"]]);
export {
  providers_layout as default
};
