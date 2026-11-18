// Hover, focus, viewport clamping, and dismissal follow Caplin's
// reader/dist/score-annotations.js (GPL-3.0-only).
const active = new WeakMap();
let nextId = 0;

export function bindRomanNumeralTooltip(anchor, render) {
  const document = anchor.ownerDocument;
  const window = document.defaultView;
  let tooltip = null, timer = 0;
  const clear = () => window.clearTimeout(timer);
  const relatedInside = (element, related) => related instanceof window.Node && element?.contains(related);
  const outside = event => {
    if (!relatedInside(anchor, event.target) && !relatedInside(tooltip, event.target)) hide();
  };
  const scroll = event => { if (!relatedInside(tooltip, event.target)) hide(); };
  const escape = event => { if (event.key === 'Escape') hide(); };
  const events = [
    ['scroll', scroll, true], ['resize', hide], ['blur', hide],
    ['pointerdown', outside, true], ['keydown', escape],
  ];

  function hide() {
    clear();
    if (!tooltip) return;
    const revision = (anchor.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== tooltip.id);
    if (revision.length) anchor.setAttribute('aria-describedby', revision.join(' '));
    else anchor.removeAttribute('aria-describedby');
    tooltip.remove();
    tooltip = null;
    for (const [type, listener, capture] of events) window.removeEventListener(type, listener, capture);
    if (active.get(document) === hide) active.delete(document);
  }

  function show() {
    clear();
    if (tooltip) return;
    active.get(document)?.();
    active.set(document, hide);
    tooltip = document.createElement('div');
    tooltip.className = 'rawln-rn-tooltip';
    tooltip.id = 'rawln-rn-tooltip-' + ++nextId;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.innerHTML = render();
    tooltip.addEventListener('pointerenter', clear);
    tooltip.addEventListener('pointerleave', event => {
      if (!relatedInside(anchor, event.relatedTarget)) hide();
    });
    document.body.append(tooltip);
    const uses = anchor.getAttribute('aria-describedby');
    anchor.setAttribute('aria-describedby', uses ? uses + ' ' + tooltip.id : tooltip.id);
    for (const [type, listener, capture] of events) window.addEventListener(type, listener, capture);

    const box = anchor.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - bounds.width - 8, box.left + (box.width - bounds.width) / 2);
    const top = box.top >= bounds.height + 9 ? box.top - bounds.height - 9
      : Math.min(window.innerHeight - bounds.height - 8, box.bottom + 9);
    tooltip.style.left = Math.max(8, left) + 'px';
    tooltip.style.top = Math.max(8, top) + 'px';
  }

  const leave = event => {
    if (event.pointerType === 'touch' || relatedInside(anchor, event.relatedTarget)
        || relatedInside(tooltip, event.relatedTarget)) return;
    clear();
    timer = window.setTimeout(hide, 140);
  };
  const stop = event => event.stopPropagation();
  const click = event => {
    stop(event);
    show();
  };
  const key = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      stop(event);
      show();
    }
  };
  const triggers = [
    ['pointerover', show], ['pointerout', leave], ['focusin', show], ['focusout', leave],
    ['pointerdown', stop], ['click', click], ['keydown', key],
  ];
  for (const [type, listener] of triggers) anchor.addEventListener(type, listener);
  return () => {
    hide();
    for (const [type, listener] of triggers) anchor.removeEventListener(type, listener);
  };
}
