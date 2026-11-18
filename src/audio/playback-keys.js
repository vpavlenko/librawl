const targets = new WeakMap();
const textControls = 'input, textarea, [contenteditable]:not([contenteditable="false"]), [role~="textbox"]';
const readerControls = [
  textControls, 'select', 'button', 'summary', 'dialog[open]',
  ...['button', 'checkbox', 'combobox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'option', 'radio', 'slider', 'switch', 'tab'].map(role => `[role~="${role}"]`),
  'audio[controls]', 'video[controls]',
].join(',');

/** A persistent app supplies toggle. Example players supply pause and declare when active. */
export function bindPlaybackKeys({
  target = globalThis.document, pause, toggle, enabled = () => true,
  allowInInputs = false, preventScrollWhenIdle = false,
}) {
  let registry = targets.get(target);
  if (!registry) {
    const bindings = new Set();
    const active = new Set();
    let consumed = false;
    const keydown = event => {
      if (event.code !== 'Space' && event.key !== ' ' && event.key !== 'Spacebar') return;
      if (!event.repeat) consumed = false;
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey ||
          event.altKey || event.shiftKey) return;
      let app;
      let idleBlocker = false;
      for (const binding of bindings) {
        if ((binding.toggle || binding.preventScrollWhenIdle) && binding.enabled()) {
          if (binding.toggle) app = binding;
          if (binding.preventScrollWhenIdle) idleBlocker = true;
        }
      }
      let player = app;
      if (!player) {
        for (const binding of active) if (binding.enabled()) player = binding;
      }
      if (!player && !idleBlocker && !consumed) return;
      const element = event.composedPath?.()[0] ?? event.target;
      if (app ? !app.allowInInputs && element?.closest?.(textControls)
              : element?.closest?.(readerControls) || target.querySelector?.('dialog[open]')) return;
      event.preventDefault();
      if (app) event.stopPropagation();
      consumed = true;
      if (!event.repeat) (player?.toggle ?? player?.pause)?.();
    };
    registry = {bindings, active, keydown};
    target.addEventListener('keydown', keydown, true);
    targets.set(target, registry);
  }

  const player = {pause, toggle, enabled, allowInInputs, preventScrollWhenIdle};
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
        target.removeEventListener('keydown', registry.keydown, true);
        targets.delete(target);
      }
    },
  };
}
