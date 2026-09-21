import { c as cn, a as cva } from "./index-1pL5IT2O.js";
import { d as defineComponent, c as createElementBlock, n as normalizeClass, u as unref, r as renderSlot, o as openBlock } from "./index-BsLBVoAX.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Badge",
  props: {
    variant: { default: "default" },
    class: { type: [Boolean, null, String, Object, Array] }
  },
  setup(__props) {
    const badgeVariants = cva(
      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
      {
        variants: {
          variant: {
            default: "border-transparent bg-primary text-primary-foreground shadow",
            secondary: "border-transparent bg-secondary text-secondary-foreground",
            outline: "text-foreground"
          }
        },
        defaultVariants: { variant: "default" }
      }
    );
    const props = __props;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(cn)(unref(badgeVariants)({ variant: __props.variant }), props.class))
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
export {
  _sfc_main as _
};
