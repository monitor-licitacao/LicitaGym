import { g as getAdminStats } from "./admin-api-eAi4GxxB.js";
import { d as defineComponent, l as onMounted, c as createElementBlock, a as createBaseVNode, t as toDisplayString, p as createCommentVNode, b as ref, o as openBlock } from "./index-BsLBVoAX.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { key: 0 };
const _hoisted_2 = {
  key: 1,
  role: "alert"
};
const _hoisted_3 = { key: 2 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdminHome",
  setup(__props) {
    const stats = ref(null);
    const erro = ref(null);
    const carregando = ref(true);
    onMounted(async () => {
      try {
        stats.value = await getAdminStats();
      } catch (e) {
        erro.value = e instanceof Error ? e.message : "Falha ao carregar métricas";
      } finally {
        carregando.value = false;
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", null, [
        _cache[2] || (_cache[2] = createBaseVNode("h1", null, "Painel administrativo", -1)),
        carregando.value ? (openBlock(), createElementBlock("p", _hoisted_1, "Carregando…")) : erro.value ? (openBlock(), createElementBlock("p", _hoisted_2, toDisplayString(erro.value), 1)) : stats.value ? (openBlock(), createElementBlock("dl", _hoisted_3, [
          _cache[0] || (_cache[0] = createBaseVNode("dt", null, "Usuários", -1)),
          createBaseVNode("dd", null, toDisplayString(stats.value.usuarios), 1),
          _cache[1] || (_cache[1] = createBaseVNode("dt", null, "Sincronizações pendentes", -1)),
          createBaseVNode("dd", null, toDisplayString(stats.value.sincronizacoesPendentes), 1)
        ])) : createCommentVNode("", true)
      ]);
    };
  }
});
const AdminHome = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e45d6a77"]]);
export {
  AdminHome as default
};
