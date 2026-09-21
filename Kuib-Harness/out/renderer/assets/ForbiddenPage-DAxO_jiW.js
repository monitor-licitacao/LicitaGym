import { d as defineComponent, c as createElementBlock, a as createBaseVNode, f as createVNode, w as withCtx, u as unref, R as RouterLink, o as openBlock, g as createTextVNode } from "./index-BsLBVoAX.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ForbiddenPage",
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", null, [
        _cache[1] || (_cache[1] = createBaseVNode("h1", null, "403 — Acesso negado", -1)),
        _cache[2] || (_cache[2] = createBaseVNode("p", null, "Esta área é exclusiva de administradores.", -1)),
        createVNode(unref(RouterLink), { to: { name: "home" } }, {
          default: withCtx(() => [..._cache[0] || (_cache[0] = [
            createTextVNode("Voltar ao início", -1)
          ])]),
          _: 1
        })
      ]);
    };
  }
});
const ForbiddenPage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b9683b1a"]]);
export {
  ForbiddenPage as default
};
