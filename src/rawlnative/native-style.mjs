import {RAWL_COLORS,pitchColor,noteColorClass} from "./colors.mjs";
/** The exact former Rawl createGlobalStyle template, without a styling-library dependency. */
export const nativeColorStyles=()=>`
  :root {
    ${RAWL_COLORS.map(({ background }, pitch) =>
      `--pitch-color-${pitch}: ${background};`,
    ).join("\n")}
  }

  .noteColor_default, .noteColor_default_colors {
    background-color: ${pitchColor(0)};
  }

  ${RAWL_COLORS.map(({ dot }, pitch) => `
    .${noteColorClass(pitch)} {
      background-color: ${pitchColor(pitch)} !important;
    }
    ${dot ? `
      .${noteColorClass(pitch)}::after, .pitchDot_${pitch}::after {
        content: "";
        position: absolute;
        top: calc(50% + var(--pitch-dot-offset, 0px));
        left: 50%;
        width: ${dot.size}px;
        height: ${dot.size}px;
        background-color: ${dot.color} !important;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
    ` : ""}
  `).join("\n")}
`;
