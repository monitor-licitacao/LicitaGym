import { l as listAdminUsuarios } from "./admin-api-eAi4GxxB.js";
import { d as defineComponent, l as onMounted, c as createElementBlock, a as createBaseVNode, t as toDisplayString, F as Fragment, h as renderList, b as ref, o as openBlock } from "./index-BsLBVoAX.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { key: 0 };
const _hoisted_2 = {
  key: 1,
  role: "alert"
};
const _hoisted_3 = { key: 2 };
const _hoisted_4 = { key: 3 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdminUsuarios",
  setup(__props) {
    const usuarios = ref([]);
    const erro = ref(null);
    const carregando = ref(true);
    onMounted(async () => {
      try {
        usuarios.value = await listAdminUsuarios();
      } catch (e) {
        erro.value = e instanceof Error ? e.message : "Falha ao listar usuários";
      } finally {
        carregando.value = false;
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", null, [
        _cache[1] || (_cache[1] = createBaseVNode("h1", null, "Usuários", -1)),
        carregando.value ? (openBlock(), createElementBlock("p", _hoisted_1, "Carregando…")) : erro.value ? (openBlock(), createElementBlock("p", _hoisted_2, toDisplayString(erro.value), 1)) : usuarios.value.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_3, "Nenhum perfil encontrado.")) : (openBlock(), createElementBlock("table", _hoisted_4, [
          _cache[0] || (_cache[0] = createBaseVNode("thead", null, [
            createBaseVNode("tr", null, [
              createBaseVNode("th", null, "E-mail"),
              createBaseVNode("th", null, "Criado em"),
              createBaseVNode("th", null, "ID")
            ])
          ], -1)),
          createBaseVNode("tbody", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(usuarios.value, (u) => {
              return openBlock(), createElementBlock("tr", {
                key: u.id
              }, [
                createBaseVNode("td", null, toDisplayString(u.email ?? "—"), 1),
                createBaseVNode("td", null, toDisplayString(u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "—"), 1),
                createBaseVNode("td", null, [
                  createBaseVNode("code", null, toDisplayString(u.id), 1)
                ])
              ]);
            }), 128))
          ])
        ]))
      ]);
    };
  }
});
const AdminUsuarios = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-51b63f2d"]]);
export {
  AdminUsuarios as default
};
