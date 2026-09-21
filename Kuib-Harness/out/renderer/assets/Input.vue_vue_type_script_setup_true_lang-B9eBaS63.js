import { c as cn } from "./index-1pL5IT2O.js";
import { d as defineComponent, c as createElementBlock, n as normalizeClass, u as unref, o as openBlock } from "./index-BsLBVoAX.js";
const _hoisted_1 = ["type", "value", "placeholder"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Input",
  props: {
    modelValue: {},
    class: { type: [Boolean, null, String, Object, Array] },
    placeholder: {},
    type: {}
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("input", {
        type: __props.type ?? "text",
        value: __props.modelValue,
        placeholder: __props.placeholder,
        class: normalizeClass(
          unref(cn)(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            props.class
          )
        ),
        onInput: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event.target.value))
      }, null, 42, _hoisted_1);
    };
  }
});
export {
  _sfc_main as _
};
