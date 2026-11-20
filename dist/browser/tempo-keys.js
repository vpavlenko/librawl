/*! librawl version: 0.3.5-local; audio source sha256: 76f73238ecd37f8747ca6b9c5ea8b19675b7cc1977a886b66f6012c991fda089; GPL-3.0-only */
var LibrawlTempoKeys = (() => {
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

  // src/audio/tempo-keys.js
  var tempo_keys_exports = {};
  __export(tempo_keys_exports, {
    bindTempoKeys: () => bindTempoKeys
  });
  function bindTempoKeys({ target = globalThis.document, adjustTempo, enabled = () => true }) {
    const deltas = { "-": -0.1, "=": 0.1, "_": -0.01, "+": 0.01 };
    const keydown = (event) => {
      var _a, _b;
      const delta = deltas[event.key], element = event.target;
      if (delta === void 0 || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !enabled()) return;
      if ((_a = element == null ? void 0 : element.closest) == null ? void 0 : _a.call(element, 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog[open]')) return;
      if ((_b = target.querySelector) == null ? void 0 : _b.call(target, "dialog[open]")) return;
      if (adjustTempo(delta, event) !== false) event.preventDefault();
    };
    target.addEventListener("keydown", keydown);
    return () => target.removeEventListener("keydown", keydown);
  }
  return __toCommonJS(tempo_keys_exports);
})();
