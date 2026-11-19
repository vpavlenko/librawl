import {mod, tonicAt} from '../notation/geometry.mjs';
import {RAWL_COLORS} from '../notation/palette.mjs';

// Rawl's per-measure strip favors the lowest downbeat, then a held note,
// then the first attack in the measure. Use the same 50 ms downbeat window.
export function mediaTimeline(score, clock, changes = []) {
  const {notes, beats, tonic = 0, barBeats = 4} = score;
  const {secondsAt} = clock;
  const bars = score.measureMap ?? (barBeats > 0 && Number.isFinite(barBeats)
    ? Array.from({length: Math.ceil(beats / barBeats)}, (_, index) => {
      const start = index * barBeats;
      return {start, duration: Math.min(barBeats, beats - start)};
    }) : []);
  const byOnset = notes.map(note => {
    const [start, end] = note.playbackSpan ?? [note.start, note.start + note.duration];
    return {note, start: secondsAt(start), end: secondsAt(end)};
  }).sort((a, b) => a.start - b.start || a.note.pitch - b.note.pitch);
  const byPitch = [...byOnset].sort((a, b) => a.note.pitch - b.note.pitch);
  const bassBars = bars.flatMap(bar => {
    const start = secondsAt(bar.start);
    const end = secondsAt(bar.start + bar.duration);
    const picked = byPitch.find(note => note.start >= start - .05 && note.start <= start + .05)
      ?? byPitch.find(note => note.start <= start + .05 && note.end > start - .05)
      ?? byOnset.find(note => note.start >= start && note.start < end);
    if (!picked) return [];
    const {note} = picked;
    const degree = mod(note.pitch - tonicAt(tonic, changes, note.start + note.duration / 2));
    return [{start, end, color: RAWL_COLORS[degree].background}];
  });
  let previous = tonic;
  const coloredMarks = changes.flatMap(({beat, tonic: next}) => {
    const shift = mod(next - previous);
    previous = next;
    return beat > 0 && shift ? [{time: secondsAt(beat), color: RAWL_COLORS[shift].background}] : [];
  });
  return {sections: score.rows?.map(row => secondsAt(row.start)),
    phrases: score.phraseStarts?.map(secondsAt), bassBars, coloredMarks};
}
