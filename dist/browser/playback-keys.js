/*! librawl version: 0.4.0-local; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */
var LibrawlPlaybackKeys = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/audio/playback-keys.js
  var playback_keys_exports = {};
  __export(playback_keys_exports, {
    bindPlaybackKeys: () => bindPlaybackKeys
  });
  var targets = /* @__PURE__ */ new WeakMap();
  var textControls = 'input, textarea, [contenteditable]:not([contenteditable="false"]), [role~="textbox"]';
  var readerControls = [
    textControls,
    "select",
    "button",
    "summary",
    "dialog[open]",
    ...[
      "button",
      "checkbox",
      "combobox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "slider",
      "switch",
      "tab"
    ].map((role) => `[role~="${role}"]`),
    "audio[controls]",
    "video[controls]"
  ].join(",");
  function bindPlaybackKeys({
    target = globalThis.document,
    pause,
    toggle,
    enabled = () => true,
    allowInInputs = false,
    preventScrollWhenIdle = false
  }) {
    let registry = targets.get(target);
    if (!registry) {
      const bindings = /* @__PURE__ */ new Set();
      const active = /* @__PURE__ */ new Set();
      let consumed = false;
      const keydown = (event) => {
        var _a, _b, _c, _d, _e, _f, _g;
        if (event.code !== "Space" && event.key !== " " && event.key !== "Spacebar") return;
        if (!event.repeat) consumed = false;
        if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        let app;
        let idleBlocker = false;
        for (const binding of bindings) {
          if ((binding.toggle || binding.preventScrollWhenIdle) && binding.enabled()) {
            if (binding.toggle) app = binding;
            if (binding.preventScrollWhenIdle) idleBlocker = true;
          }
        }
        let player2 = app;
        if (!player2) {
          for (const binding of active) if (binding.enabled()) player2 = binding;
        }
        if (!player2 && !idleBlocker && !consumed) return;
        const element = (_b = (_a = event.composedPath) == null ? void 0 : _a.call(event)[0]) != null ? _b : event.target;
        if (app ? !app.allowInInputs && ((_c = element == null ? void 0 : element.closest) == null ? void 0 : _c.call(element, textControls)) : ((_d = element == null ? void 0 : element.closest) == null ? void 0 : _d.call(element, readerControls)) || ((_e = target.querySelector) == null ? void 0 : _e.call(target, "dialog[open]"))) return;
        event.preventDefault();
        if (app) event.stopPropagation();
        consumed = true;
        if (!event.repeat) (_g = (_f = player2 == null ? void 0 : player2.toggle) != null ? _f : player2 == null ? void 0 : player2.pause) == null ? void 0 : _g();
      };
      registry = { bindings, active, keydown };
      target.addEventListener("keydown", keydown, true);
      targets.set(target, registry);
    }
    const player = { pause, toggle, enabled, allowInInputs, preventScrollWhenIdle };
    registry.bindings.add(player);
    return {
      setActive(active) {
        if (!registry.bindings.has(player)) return;
        registry.active.delete(player);
        if (active) registry.active.add(player);
      },
      destroy() {
        if (!registry.bindings.delete(player)) return;
        registry.active.delete(player);
        if (!registry.bindings.size) {
          target.removeEventListener("keydown", registry.keydown, true);
          targets.delete(target);
        }
      }
    };
  }
  return __toCommonJS(playback_keys_exports);
})();
