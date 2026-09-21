import { d as defineComponent, y as useAuthStore, c as createElementBlock, a as createBaseVNode, f as createVNode, w as withCtx, u as unref, R as RouterLink, t as toDisplayString, G as RouterView, o as openBlock, g as createTextVNode } from "./index-BsLBVoAX.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { class: "admin-shell" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdminLayout",
  setup(__props) {
    const auth = useAuthStore();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("aside", null, [
          _cache[3] || (_cache[3] = createBaseVNode("strong", null, "Admin", -1)),
          createBaseVNode("nav", null, [
            createVNode(unref(RouterLink), { to: { name: "admin" } }, {
              default: withCtx(() => [..._cache[1] || (_cache[1] = [
                createTextVNode("Painel", -1)
              ])]),
              _: 1
            }),
            createVNode(unref(RouterLink), { to: { name: "admin-usuarios" } }, {
              default: withCtx(() => [..._cache[2] || (_cache[2] = [
                createTextVNode("Usuários", -1)
              ])]),
              _: 1
            })
          ]),
          createBaseVNode("footer", null, [
            createBaseVNode("span", null, toDisplayString(unref(auth).user?.email), 1),
            createBaseVNode("button", {
              type: "button",
              onClick: _cache[0] || (_cache[0] = ($event) => unref(auth).signOut())
            }, "Sair")
          ])
        ]),
        createBaseVNode("main", null, [
          createVNode(unref(RouterView))
        ])
      ]);
    };
  }
});
const AdminLayout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-814242b5"]]);
export {
  AdminLayout as default
};
