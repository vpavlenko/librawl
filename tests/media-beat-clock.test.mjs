import assert from 'node:assert/strict';
import test from 'node:test';
import {createMediaBeatClock} from '../src/audio/media-beat-clock.mjs';

const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

test('media clock converts straight beats and interpolates swing in both directions', () => {
  const straight = createMediaBeatClock(.5);
  near(straight.secondsAt(4.5), 2.25);
  near(straight.beatAt(2.25), 4.5);

  const swing = createMediaBeatClock(.5, [[0, 0], [.5, 2 / 3], [1, 1], [2, 2.25]]);
  near(swing.secondsAt(.5), 1 / 3);
  near(swing.beatAt(1 / 3), .5);
  near(swing.secondsAt(.25), 1 / 6);
  near(swing.secondsAt(.75), 5 / 12);
  near(swing.beatAt(5 / 12), .75);
  near(swing.secondsAt(-1), -.5);
  near(swing.secondsAt(3), 1.625);
  near(swing.beatAt(1.625), 3);
});

test('media beat anchors must permit an unambiguous inverse', () => {
  assert.throws(() => createMediaBeatClock(0), RangeError);
  assert.throws(() => createMediaBeatClock(.5, [[0, 0], [.5, 0]]), RangeError);
  assert.throws(() => createMediaBeatClock(.5, [[0, 0], [0, .5]]), RangeError);
  assert.throws(() => createMediaBeatClock(.5, [[0, Infinity]]), RangeError);
});
