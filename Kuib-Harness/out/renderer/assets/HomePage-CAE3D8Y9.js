import { d as defineComponent, y as useAuthStore, c as createElementBlock, a as createBaseVNode, u as unref, t as toDisplayString, q as createBlock, w as withCtx, R as RouterLink, o as openBlock, g as createTextVNode } from "./index-BsLBVoAX.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { class: "home" };
const _hoisted_2 = { key: 1 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "HomePage",
  setup(__props) {
    const auth = useAuthStore();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", _hoisted_1, [
        createBaseVNode("header", null, [
          _cache[1] || (_cache[1] = createBaseVNode("h1", null, "LicitaGym", -1)),
          createBaseVNode("button", {
            type: "button",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(auth).signOut())
          }, "Sair")
        ]),
        createBaseVNode("p", null, "Olá, " + toDisplayString(unref(auth).user?.email), 1),
        createBaseVNode("p", null, "Papel: " + toDisplayString(unref(auth).role ?? "não definido"), 1),
        unref(auth).isAdmin ? (openBlock(), createBlock(unref(RouterLink), {
          key: 0,
          to: { name: "admin" }
        }, {
          default: withCtx(() => [..._cache[2] || (_cache[2] = [
            createTextVNode("Abrir administração", -1)
          ])]),
          _: 1
        })) : (openBlock(), createElementBlock("p", _hoisted_2, "Sem acesso à área admin."))
      ]);
    };
  }
});
const HomePage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-98149f02"]]);
export {
  HomePage as default
};
