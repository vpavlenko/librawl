import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {bindPlaybackKeys} from '../src/audio/playback-keys.js';
import {createTransport} from '../src/audio/transport.js';

function keyboard(window) {
  return (target = window.document.body, init = {}) => {
    const event = new window.KeyboardEvent('keydown', {
      key: ' ', bubbles: true, cancelable: true, ...init,
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
}

test('Persistent playback captures Space on links and buttons and honors text entry', () => {
  const {window} = new JSDOM('<a href="#target">Solo</a><button>Tempo</button><input><textarea></textarea>');
  const {document} = window;
  const press = keyboard(window);
  let count = 0;
  const app = bindPlaybackKeys({target: document, toggle: () => count++});
  const [link, button, input, textarea] = document.body.children;
  button.addEventListener('keydown', () => assert.fail('focused buttons must not handle the captured key'));
  assert.equal(press(link), true);
  assert.equal(press(button), true);
  assert.equal(press(button, {repeat:true}), true);
  assert.equal(press(input), false);
  assert.equal(press(textarea), false);
  assert.equal(count, 2);
  app.destroy();
  const all = bindPlaybackKeys({target: document, toggle: () => count++, allowInInputs:true});
  assert.equal(press(input), true);
  assert.equal(count, 3);
  all.destroy();
  assert.equal(press(link), false);
  window.close();
});

test('Space pauses the latest active player and consumes repeats of that press', () => {
  const {window} = new JSDOM();
  const target = window.document;
  const press = keyboard(window);
  const pauses = [];
  const first = bindPlaybackKeys({target, pause: () => {
    pauses.push('first');
    first.setActive(false);
  }});
  const second = bindPlaybackKeys({target, pause: () => {
    pauses.push('second');
    second.setActive(false);
  }});
  assert.equal(press(), false);
  first.setActive(true);
  second.setActive(true);
  assert.equal(press(), true);
  assert.equal(press(undefined, {repeat: true}), true);
  assert.deepEqual(pauses, ['second']);
  assert.equal(press(), true);
  assert.deepEqual(pauses, ['second', 'first']);
  assert.equal(press(undefined, {repeat: true}), true);
  assert.equal(press(), false);
  first.destroy();
  second.destroy();
  window.close();
});

test('A reader can suppress idle scrolling without taking Space from focused controls', () => {
  const {window} = new JSDOM('<input><button><span></span></button><summary></summary>'
    + '<div contenteditable><strong></strong></div><div role="slider"></div>');
  const target = window.document;
  const press = keyboard(window);
  const binding = bindPlaybackKeys({target, pause: () => assert.fail(), preventScrollWhenIdle: true});
  assert.equal(press(), true);
  for (const control of target.querySelectorAll('input, button span, summary, strong, [role="slider"]')) {
    assert.equal(press(control), false);
  }
  for (const options of [{ctrlKey: true}, {metaKey: true}, {altKey: true}, {shiftKey: true}, {isComposing: true}]) {
    assert.equal(press(undefined, options), false);
  }
  const dialog = target.createElement('dialog');
  dialog.open = true;
  target.body.append(dialog);
  assert.equal(press(), false);
  binding.destroy();
  dialog.remove();
  assert.equal(press(), false);
  window.close();
});

test('The transport shortcut cancels preparation without starting the engine later', async t => {
  const {window} = new JSDOM();
  globalThis.document = window.document;
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    delete globalThis.document;
    delete globalThis.cancelAnimationFrame;
    window.close();
  });
  const press = keyboard(window);
  let finishResume;
  const audio = {
    getContext: () => ({resume: () => new Promise(resolve => { finishResume = resolve; })}),
    prepare: () => assert.fail('cancelled preparation must not start'),
    stop: () => {},
  };
  const transport = createTransport({makePlan: () => {}, audio});
  transport.load({beats: 4, tempo: 120});
  const play = transport.play();
  assert.equal(transport.state, 'loading');
  assert.equal(press(), true);
  assert.equal(transport.state, 'paused');
  finishResume();
  await play;
  assert.equal(press(), false);
  transport.destroy();
});
