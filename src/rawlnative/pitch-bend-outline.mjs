import {voiceCornerRadii} from './voice-shapes.mjs';

// Uniform angle steps keep the outline smooth near the vertical note ends.
const cornerSamples = Array.from({length: 11}, (_, i) =>
  1 - Math.cos((i + 1) * Math.PI / 24),
).concat(1);
const reversedCornerSamples = [...cornerSamples].reverse();

function cornerInset(distance, radius) {
  return distance < radius
    ? radius - Math.sqrt(distance * (2 * radius - distance))
    : 0;
}

export function pitchBendOutline(samples, height, displayVoiceIndex) {
  const width = samples[samples.length - 1].x;
  const [topLeft, topRight, bottomRight, bottomLeft] = voiceCornerRadii(displayVoiceIndex);
  // Match CSS border-radius scaling when adjacent corners would overlap.
  const limit = (length, sum) => sum > 0 ? length / sum : 1;
  const scale = Math.min(1,
    limit(width, topLeft + topRight),
    limit(width, bottomLeft + bottomRight),
    limit(height, topLeft + bottomLeft),
    limit(height, topRight + bottomRight),
  );

  function edge(left, right, bottom) {
    const cornerXs = [
      ...(left ? cornerSamples.map(fraction => fraction * left) : []),
      ...(right ? reversedCornerSamples.map(fraction => width - fraction * right) : []),
    ];
    const points = [samples[0]];
    let nextCorner = 0;
    for (let i = 1; i < samples.length; i++) {
      const previous = samples[i - 1];
      const current = samples[i];
      // Insert corner points between existing bends so every original bend is kept.
      while (nextCorner < cornerXs.length && cornerXs[nextCorner] < current.x) {
        const x = cornerXs[nextCorner++];
        if (x > points[points.length - 1].x) {
          const fraction = (x - previous.x) / (current.x - previous.x);
          points.push({x, y: previous.y + fraction * (current.y - previous.y)});
        }
      }
      points.push(current);
    }
    if (bottom) points.reverse();
    return points.map(({x, y}) => {
      const inset = cornerInset(x, left) + cornerInset(width - x, right);
      return `${x} ${y + (bottom ? height - inset : inset)}`;
    }).join(' L ');
  }

  const top = edge(topLeft * scale, topRight * scale, false);
  const bottom = edge(bottomLeft * scale, bottomRight * scale, true);
  return `M ${top} L ${bottom} Z`;
}
