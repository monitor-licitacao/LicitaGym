import { d as defineComponent, y as useAuthStore, l as onMounted, c as createElementBlock, a as createBaseVNode, g as createTextVNode, t as toDisplayString, p as createCommentVNode, f as createVNode, u as unref, w as withCtx, j as withModifiers, b as ref, o as openBlock, E as useRoute, z as useRouter } from "./index-BsLBVoAX.js";
import { _ as _sfc_main$2 } from "./index-1pL5IT2O.js";
import { _ as _sfc_main$1 } from "./Input.vue_vue_type_script_setup_true_lang-B9eBaS63.js";
const _hoisted_1 = { class: "mx-auto mt-16 max-w-sm rounded-xl border bg-card p-6 shadow-sm" };
const _hoisted_2 = {
  key: 0,
  class: "mt-2 text-xs text-muted-foreground"
};
const _hoisted_3 = { class: "flex flex-col gap-1 text-sm" };
const _hoisted_4 = { class: "flex flex-col gap-1 text-sm" };
const _hoisted_5 = {
  key: 0,
  class: "m-0 text-sm text-destructive",
  role: "alert"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LoginPage",
  setup(__props) {
    const auth = useAuthStore();
    const route = useRoute();
    const router = useRouter();
    const login = ref("");
    const senha = ref("");
    const erro = ref(null);
    const enviando = ref(false);
    const hintLogin = ref(null);
    const hintSenhaLen = ref(0);
    onMounted(async () => {
      try {
        const status = await window.auth.status();
        if (status.configuredLogin) {
          hintLogin.value = status.configuredLogin;
          login.value = status.configuredLogin;
          hintSenhaLen.value = status.configuredSenhaLen;
        }
      } catch {
      }
    });
    async function onSubmit() {
      erro.value = null;
      enviando.value = true;
      try {
        await auth.signIn(login.value.trim(), senha.value.trim());
        const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
        await router.replace(redirect);
      } catch (e) {
        erro.value = e instanceof Error ? e.message : "Falha ao entrar";
      } finally {
        enviando.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("section", _hoisted_1, [
        _cache[4] || (_cache[4] = createBaseVNode("h1", { class: "m-0 text-xl font-bold tracking-tight" }, "Kuib Harness", -1)),
        _cache[5] || (_cache[5] = createBaseVNode("p", { class: "mt-1 text-sm text-muted-foreground" }, [
          createTextVNode(" Login admin — valores de "),
          createBaseVNode("code", null, "Kuib-Harness/.env.local"),
          createTextVNode(" ("),
          createBaseVNode("code", null, "ADMIN_LOGIN"),
          createTextVNode(" / "),
          createBaseVNode("code", null, "ADMIN_SENHA"),
          createTextVNode("). ")
        ], -1)),
        hintLogin.value ? (openBlock(), createElementBlock("p", _hoisted_2, " Login pré-preenchido (" + toDisplayString(hintLogin.value.length) + " chars). Senha esperada: " + toDisplayString(hintSenhaLen.value) + " chars. ", 1)) : createCommentVNode("", true),
        createBaseVNode("form", {
          class: "mt-4 flex flex-col gap-3",
          onSubmit: withModifiers(onSubmit, ["prevent"])
        }, [
          createBaseVNode("label", _hoisted_3, [
            _cache[2] || (_cache[2] = createTextVNode(" Login ", -1)),
            createVNode(unref(_sfc_main$1), {
              modelValue: login.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => login.value = $event),
              type: "text",
              autocomplete: "username",
              required: ""
            }, null, 8, ["modelValue"])
          ]),
          createBaseVNode("label", _hoisted_4, [
            _cache[3] || (_cache[3] = createTextVNode(" Senha ", -1)),
            createVNode(unref(_sfc_main$1), {
              modelValue: senha.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => senha.value = $event),
              type: "password",
              autocomplete: "current-password",
              required: "",
              placeholder: hintSenhaLen.value ? `${hintSenhaLen.value} caracteres` : void 0
            }, null, 8, ["modelValue", "placeholder"])
          ]),
          erro.value ? (openBlock(), createElementBlock("p", _hoisted_5, toDisplayString(erro.value), 1)) : createCommentVNode("", true),
          createVNode(unref(_sfc_main$2), {
            type: "submit",
            disabled: enviando.value
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(enviando.value ? "Entrando…" : "Entrar"), 1)
            ]),
            _: 1
          }, 8, ["disabled"])
        ], 32)
      ]);
    };
  }
});
export {
  _sfc_main as default
};
