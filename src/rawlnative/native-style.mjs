import {RAWL_COLORS,pitchColor,noteColorClass} from "./colors.mjs";

// The native renderer keeps its pitch classes for bends and fractional notes.
// A host-owned semitone note can update its current degree without rerendering.
const nativeFallback = ':where(:not([data-pitch-class]))';

export const nativeColorStyles=()=>`
  :root {
    ${RAWL_COLORS.map(({ background }, pitch) =>
      `--pitch-color-${pitch}: ${background};`,
    ).join("\n")}
  }

  .noteColor_default, .noteColor_default_colors {
    background-color: ${pitchColor(0)};
  }

  ${RAWL_COLORS.map(({ dot }, pitch) => {
    const attribute = `[data-pitch-class="${pitch}"]`;
    const colorClass = `.${noteColorClass(pitch)}${nativeFallback}`;
    return `
    ${attribute}, ${colorClass} {
      background-color: ${pitchColor(pitch)};
    }
    ${dot ? `
      ${attribute}::after, ${colorClass}::after, .pitchDot_${pitch}${nativeFallback}::after {
        content: "";
        position: absolute;
        top: calc(50% + var(--pitch-dot-offset, 0px));
        left: 50%;
        width: ${dot.size}px;
        height: ${dot.size}px;
        background-color: ${dot.color};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
    ` : ""}
  `;
  }).join("\n")}
`;
