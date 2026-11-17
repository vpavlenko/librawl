// Verbatim Rawl component and constants; standalone test harness imports/types.
import * as React from "react";
import {useContext} from "react";
type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const AnalysisTransposeContext = React.createContext(0);
const MODULATION_BADGE_WIDTH = 80;
export const PITCH_CLASS_TO_LETTER = {
  0: "C",
  1: "D♭",
  2: "D",
  3: "E♭",
  4: "E",
  5: "F",
  6: "F♯",
  7: "G",
  8: "A♭",
  9: "A",
  10: "B♭",
  11: "B",
};

export const NewTonicSymbol: React.FC<{
  left: number;
  number: number;
  previousTonic: PitchClass | null;
  modulationDiff: number | null;
  tonicStart: PitchClass;
  alignToOnset?: boolean;
}> = ({ left, number, previousTonic, modulationDiff, tonicStart, alignToOnset = false }) => {
  const transpose = useContext(AnalysisTransposeContext);
  const displayedTonic = tonicStart == null
    ? tonicStart
    : ((tonicStart + transpose) % 12 + 12) % 12;
  return (
    <>
      <span
        style={{
          color: "white",
          position: "absolute",
          top: -2,
          left: alignToOnset
            ? left
            : left + (previousTonic === null ? String(number).length * 8 + 10 : 30),
          fontSize: 12,
          zIndex: 100,
          fontWeight: 700,
          userSelect: "none",
          pointerEvents: "none",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {previousTonic !== null && (
          <>{`${
            modulationDiff > 6
              ? `↓${Math.abs(modulationDiff - 12)}`
              : `↑${modulationDiff}`
          } `}</>
        )}
        {PITCH_CLASS_TO_LETTER[displayedTonic]}
      </span>
  
      <div
        className={`noteColor_${modulationDiff}_colors`}
        style={{
          width: MODULATION_BADGE_WIDTH,
          height: 12,
          position: "absolute",
          top: 0,
          left: left,
          zIndex: 3,
          userSelect: "none",
          pointerEvents: "none",
          maskImage:
            "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
    </>
  );
};
