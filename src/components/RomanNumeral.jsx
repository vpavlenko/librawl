import React, {useEffect, useMemo, useRef} from 'react';
import {romanNumeralContent} from '../notation/roman-numerals.mjs';
import {romanNumeralTooltipHTML, romanNumeralTooltipModel} from '../notation/roman-numeral-tooltip.mjs';
import {bindRomanNumeralTooltip} from '../notation/bind-roman-numeral-tooltip.mjs';

export function RomanNumeral({notation, options, tooltip = true}) {
  const ref = useRef(null);
  const model = useMemo(() => romanNumeralTooltipModel(notation, options, tooltip), [notation, options, tooltip]);
  useEffect(() => {
    if (!model) return;
    return bindRomanNumeralTooltip(ref.current, () => romanNumeralTooltipHTML(notation, options ?? {}, model));
  }, [notation, options, model]);
  return <span ref={ref} className="rawln-roman" data-roman-theme={options?.theme==='light'?'light':'dark'}
    data-roman-font={options?.font === 'sans-serif' ? 'sans-serif' : undefined}
    data-rn-tooltip={model ? '' : undefined} tabIndex={model ? 0 : undefined}
    dangerouslySetInnerHTML={{__html:romanNumeralContent(notation,options)}} />;
}
