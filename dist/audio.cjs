/*! librawl version: 0.3.4; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/audio.js
var audio_exports = {};
__export(audio_exports, {
  bindTempoKeys: () => bindTempoKeys,
  createSoundFontPlayback: () => createSoundFontPlayback,
  createTransport: () => createTransport
});
module.exports = __toCommonJS(audio_exports);

// src/audio/continuous-playback.js
function attachContinuousPlayback(engine, { setInterval, clearInterval, presentationTime, horizon = 0.14, interval = 25 }) {
  const play = engine.play.bind(engine), stop = engine.stop.bind(engine), createClock = engine.createClock.bind(engine);
  let session = null;
  const priority = (e) => e.type === "cc" && [0, 32].includes(e.controller) ? -1 : { program: 0, cc: 1, off: 2, on: 3 }[e.type];
  function scoreAt(s, time) {
    var _a;
    const segment = (_a = [...s.segments].reverse().find((a) => a.time <= time)) != null ? _a : s.segments[0];
    return segment.score + (time - segment.time) * segment.rate;
  }
  function timeAt(s, score) {
    var _a;
    const segment = (_a = [...s.segments].reverse().find((a) => a.score <= score + 1e-10)) != null ? _a : s.segments[0];
    return segment.time + (score - segment.score) / segment.rate;
  }
  engine.stop = () => {
    session = null;
    stop();
  };
  engine.play = (plan, mixers, offset = 0, output = engine.context.destination) => {
    var _a;
    const start = play({ ...plan, events: [], notes: [] }, mixers, offset, output), offsetTime = plan.timeAt(offset);
    const snapshotAt = (beat2) => {
      var _a2;
      const snapshot = /* @__PURE__ */ new Map();
      for (const event of plan.events) if (event.beat <= beat2 && ["program", "cc"].includes(event.type)) snapshot.set([event.channel, event.type, (_a2 = event.controller) != null ? _a2 : ""].join(":"), { ...event, beat: beat2 });
      return [...snapshot.values()];
    };
    const heldAt = (beat2) => plan.notes.filter((n) => n.start < beat2 && n.end > beat2).map((n) => ({ beat: beat2, type: "on", channel: n.channel, pitch: n.pitch, velocity: n.velocity }));
    const events = [...snapshotAt(offset), ...heldAt(offset), ...plan.events.filter((e) => e.beat >= offset && (e.type === "on" || e.type === "off") || e.beat > offset && e.type === "cc")].sort((a, b) => a.beat - b.beat || priority(a) - priority(b));
    const s = { plan, start, offset, segments: [{ time: start, score: offsetTime, rate: 1 }], requestedRate: 1, committedUntil: start, cursor: 0, clock: null, pump: null, dynamic: false, sent: [] };
    session = s;
    let previous = offset;
    const end = (_a = plan.beats) != null ? _a : plan.beatAt(plan.duration), endTime = () => timeAt(s, plan.timeAt(end));
    const beat = () => {
      const now = presentationTime(engine.context);
      if (now < start) return null;
      previous = Math.max(previous, Math.min(end, plan.beatAt(scoreAt(s, now))));
      return previous;
    };
    s.clock = { beat, position: () => {
      var _a2;
      return (_a2 = beat()) != null ? _a2 : offset;
    }, endTime, remaining: () => Math.max(0, endTime() - presentationTime(engine.context)) };
    const send = (event, time) => {
      s.committedUntil = Math.max(s.committedUntil, time);
      engine.fence = Math.max(engine.fence, time);
      s.sent.push({ event, time });
      const options = { time }, synth = engine.synth;
      if (event.type === "program") synth.programChange(event.channel, event.program, options);
      else if (event.type === "cc") synth.controllerChange(event.channel, event.controller, event.value, options);
      else if (event.type === "on") synth.noteOn(event.channel, event.pitch, event.velocity, options);
      else synth.noteOff(event.channel, event.pitch, options);
    };
    s.pump = () => {
      if (session !== s) return;
      const now = engine.context.currentTime, until = now + horizon;
      if (s.cursor < events.length && timeAt(s, plan.timeAt(events[s.cursor].beat)) < now - horizon) {
        const time = now + 0.01, currentBeat = plan.beatAt(scoreAt(s, time));
        if (s.dynamic) {
          const active = /* @__PURE__ */ new Map(), settings = /* @__PURE__ */ new Map(), key = (e) => e.channel + ":" + e.pitch, setting = (e) => {
            var _a2;
            return [e.channel, e.type, (_a2 = e.controller) != null ? _a2 : ""].join(":");
          };
          for (const { event: e, time: at } of s.sent) if (at <= time) {
            if (e.type === "on") active.set(key(e), e);
            else if (e.type === "off") active.delete(key(e));
            else settings.set(setting(e), e);
          }
          const expected = heldAt(currentBeat), wanted = new Set(expected.map(key));
          for (const e of active.values()) if (!wanted.has(key(e))) send({ ...e, beat: currentBeat, type: "off" }, time);
          for (const e of snapshotAt(currentBeat)) {
            const old = settings.get(setting(e));
            if (!old || (e.type === "program" ? old.program !== e.program : old.value !== e.value)) send(e, time);
          }
          for (const e of expected) if (!active.has(key(e))) send(e, time);
        } else {
          for (const channel of plan.channels) engine.synth.controllerChange(channel.channel, 120, 0, { time });
          [...snapshotAt(currentBeat), ...heldAt(currentBeat)].sort((a, b) => priority(a) - priority(b)).forEach((event) => send(event, time));
        }
        while (s.cursor < events.length && events[s.cursor].beat < currentBeat) s.cursor++;
      }
      while (s.cursor < events.length) {
        const event = events[s.cursor], time = timeAt(s, plan.timeAt(event.beat));
        if (time > until) break;
        s.cursor++;
        send(event, time);
      }
      if (s.cursor === events.length) {
        clearInterval(engine.interval);
        engine.interval = null;
      }
    };
    engine.interval = setInterval(s.pump, interval);
    s.pump();
    return start;
  };
  engine.createClock = (plan, start, offset = 0) => (session == null ? void 0 : session.plan) === plan && session.start === start && session.offset === offset ? session.clock : createClock(plan, start, offset);
  engine.setRate = (rate) => {
    if (!Number.isFinite(rate) || rate <= 0) throw new RangeError("Playback rate must be positive");
    const s = session;
    if (!s) return;
    if (rate === s.requestedRate) return;
    const time = Math.max(engine.context.currentTime, s.start, s.committedUntil), score = scoreAt(s, time);
    s.segments = s.segments.filter((a) => a.time < time);
    s.segments.push({ time, score, rate });
    s.requestedRate = rate;
    s.dynamic = true;
    s.pump();
  };
  engine.getRate = () => {
    var _a;
    return (_a = session == null ? void 0 : session.requestedRate) != null ? _a : 1;
  };
  engine.remaining = () => {
    var _a;
    return (_a = session == null ? void 0 : session.clock.remaining()) != null ? _a : 0;
  };
  return engine;
}

// src/audio/soundfont-playback.js
var import_meta = {};
function createSoundFontPlayback(options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const global = (_a = options.environment) != null ? _a : globalThis;
  const setTimeout = (...args) => {
    var _a2;
    return ((_a2 = global.setTimeout) != null ? _a2 : globalThis.setTimeout).apply(global, args);
  }, clearTimeout = (...args) => {
    var _a2;
    return ((_a2 = global.clearTimeout) != null ? _a2 : globalThis.clearTimeout).apply(global, args);
  }, setInterval = (...args) => {
    var _a2;
    return ((_a2 = global.setInterval) != null ? _a2 : globalThis.setInterval).apply(global, args);
  }, clearInterval = (...args) => {
    var _a2;
    return ((_a2 = global.clearInterval) != null ? _a2 : globalThis.clearInterval).apply(global, args);
  };
  const fetch = (_d = (_c = (_b = options.fetch) != null ? _b : global.fetch) != null ? _c : globalThis.fetch) == null ? void 0 : _d.bind(global), AbortController = (_e = global.AbortController) != null ? _e : globalThis.AbortController;
  const reference = (_i = (_h = (_f = global.document) == null ? void 0 : _f.baseURI) != null ? _h : (_g = global.location) == null ? void 0 : _g.href) != null ? _i : import_meta.url;
  const resolveAsset = (value) => options.assetBase ? new URL(String(value), new URL(String(options.assetBase), reference)).href : String(value);
  const libraryUrl = resolveAsset((_j = options.libraryUrl) != null ? _j : "./vendor/spessasynth/index.js"), workletUrl = resolveAsset((_k = options.workletUrl) != null ? _k : "vendor/spessasynth/spessasynth_processor.min.js");
  const importLibrary = (_l = options.importLibrary) != null ? _l : ((url) => import(url));
  const additionalBanks = ((_m = options.additionalBanks) != null ? _m : []).map((bank) => {
    if (!bank || typeof bank.url !== "string" || !bank.name || !Number.isInteger(bank.bytes) || bank.bytes <= 0 || !/^[a-f0-9]{64}$/.test(bank.sha256)) throw new Error("Invalid SoundFont bank descriptor");
    return { ...bank, url: resolveAsset(bank.url) };
  });
  const auditionProgram = (program) => options.allowAuditionPrograms ? program : 0;
  const HORIZON = 0.14, INTERVAL = 25, MASTER_GAIN = 3, AUDITION_CHANNEL = 9;
  const ROOM = Object.freeze({ wet: 0.14, seconds: 1.1, decaySeconds: 0.85, preDelay: 0.014, seed: 241024 });
  const BANK = { bytes: 5758964, sha256: "f2a57c0c85d3b118b39d6cf6f5eb9447e8a22ec3884e6f616951412d7f5c3460" };
  let engine, pending, audioContext, phase = "idle", lastError = null;
  const aborted = () => Object.assign(new Error("SoundFont initialization cancelled"), { name: "AbortError" });
  function bounded(promise, milliseconds, stage, signal) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal == null ? void 0 : signal.removeEventListener("abort", cancel);
        fn(value);
      };
      const cancel = () => finish(reject, aborted()), timer = setTimeout(() => finish(reject, new Error("SoundFont " + stage + " timeout")), milliseconds);
      signal == null ? void 0 : signal.addEventListener("abort", cancel, { once: true });
      Promise.resolve(promise).then((value) => finish(resolve, value), (error) => finish(reject, error));
      if (signal == null ? void 0 : signal.aborted) cancel();
    });
  }
  function presentationTime(context) {
    var _a2, _b2, _c2;
    const render = context.currentTime;
    try {
      const stamp = (_a2 = context.getOutputTimestamp) == null ? void 0 : _a2.call(context), now = (_c2 = (_b2 = global.performance) == null ? void 0 : _b2.now) == null ? void 0 : _c2.call(_b2);
      if (stamp && Number.isFinite(now) && Number.isFinite(stamp.contextTime) && stamp.contextTime >= 0 && Number.isFinite(stamp.performanceTime) && stamp.performanceTime > 0 && stamp.performanceTime <= now && now - stamp.performanceTime < 1e3) {
        const projected = stamp.contextTime + (now - stamp.performanceTime) / 1e3;
        if (projected <= render + 5e-3) return Math.min(render, projected);
      }
    } catch (e) {
    }
    const latency = [context.baseLatency, context.outputLatency].reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0);
    return Math.max(0, render - latency);
  }
  function soundingIntervals(plan, note) {
    const EPS = 1e-6;
    return plan.notes.filter((n) => n.group === note.group && n.pitch === note.pitch && n.start <= note.start + EPS && n.start < note.end - EPS && n.start + n.duration > note.start + EPS).map((n) => [Math.max(n.start, note.start), n.start + n.duration > note.end + EPS ? Math.min(n.end, note.end) : n.end]).filter(([start, end]) => end > start);
  }
  function roomImpulse(context) {
    const rate = context.sampleRate, length = Math.ceil(rate * ROOM.seconds), buffer = context.createBuffer(2, length, rate), delay = Math.ceil(rate * ROOM.preDelay);
    let random = ROOM.seed;
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let previous = 0, energy = 0;
      for (let i = delay; i < length; i++) {
        random = Math.imul(random, 1664525) + 1013904223 >>> 0;
        previous = 0.58 * previous + 0.42 * (random / 2147483648 - 1);
        const t = (i - delay) / rate;
        samples[i] = previous * Math.exp(-Math.log(1e3) * t / ROOM.decaySeconds);
        energy += samples[i] * samples[i];
      }
      const scale = 1 / Math.sqrt(energy || 1);
      for (let i = delay; i < length; i++) samples[i] *= scale;
    }
    return buffer;
  }
  class PlaybackEngine {
    constructor(context, synth) {
      this.context = context;
      this.synth = synth;
      this.connections = [];
      this.fence = 0;
      this.interval = null;
      this.roomConnections = [];
      this.roomNodes = [];
      this.roomBuffer = null;
      this.auditionState = null;
      this.auditionFence = 0;
      this.overlapAudition = null;
    }
    stopAudition() {
      this.stopOverlapAudition();
      const entry = this.auditionState;
      if (!entry) return;
      this.auditionState = null;
      clearTimeout(entry.offTimer);
      clearTimeout(entry.cleanupTimer);
      if (entry.connected) {
        const time = Math.max(this.context.currentTime, this.auditionFence) + 1e-3;
        this.auditionFence = time;
        try {
          this.synth.controllerChange(AUDITION_CHANNEL, 120, 0, { time });
        } catch (e) {
        }
        try {
          this.synth.disconnectChannel(entry.output, AUDITION_CHANNEL);
        } catch (e) {
        }
      }
      for (const node of entry.nodes) try {
        node.disconnect();
      } catch (e) {
      }
      if (!entry.ended) {
        entry.ended = true;
        try {
          entry.onEnd("cancelled");
        } catch (error) {
          console.error(error);
        }
      }
      try {
        entry.onDispose();
      } catch (error) {
        console.error(error);
      }
    }
    audition({ pitch, duration, velocity = 72, program = 0 }, onEnd = () => {
    }, onDispose = () => {
    }) {
      var _a2, _b2, _c2;
      program = auditionProgram(program);
      if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(velocity) || !Number.isInteger(program) || program < 0 || program > 127) throw new Error("Invalid audition note");
      if (typeof ((_b2 = (_a2 = this.synth.midiChannels) == null ? void 0 : _a2[AUDITION_CHANNEL]) == null ? void 0 : _b2.setDrums) !== "function") throw new Error("Audition channel unavailable");
      this.stopAudition();
      const context = this.context, start = Math.max(context.currentTime + 0.01, this.auditionFence + 5e-3), end = start + duration;
      const entry = { nodes: [], output: null, connected: false, onEnd, onDispose, ended: false, offTimer: null, cleanupTimer: null };
      this.auditionState = entry;
      try {
        const output = context.createGain();
        entry.output = output;
        entry.nodes.push(output);
        output.gain.value = 0;
        output.gain.setValueAtTime(MASTER_GAIN, start);
        output.connect(context.destination);
        if (context.createConvolver && context.createBuffer) {
          (_c2 = this.roomBuffer) != null ? _c2 : this.roomBuffer = roomImpulse(context);
          const convolver = context.createConvolver(), wet = context.createGain();
          entry.nodes.push(convolver, wet);
          convolver.normalize = false;
          convolver.buffer = this.roomBuffer;
          wet.gain.value = ROOM.wet;
          output.connect(convolver);
          convolver.connect(wet);
          wet.connect(context.destination);
        }
        entry.connected = true;
        this.synth.connectChannel(output, AUDITION_CHANNEL);
        this.synth.midiChannels[AUDITION_CHANNEL].setDrums(false);
        for (const [controller, value] of [[0, 0], [32, 0], [7, 100], [10, 64], [11, 127], [64, 0]]) this.synth.controllerChange(AUDITION_CHANNEL, controller, value, { time: start });
        this.synth.programChange(AUDITION_CHANNEL, program, { time: start });
        this.synth.noteOn(AUDITION_CHANNEL, pitch, Math.max(1, Math.min(127, Math.round(velocity))), { time: start });
        this.auditionFence = start;
        const release = () => {
          if (this.auditionState !== entry) return;
          entry.offTimer = null;
          if (context.currentTime < end) {
            entry.offTimer = setTimeout(release, Math.max(1, (end - context.currentTime) * 1e3));
            return;
          }
          const time = context.currentTime;
          try {
            this.synth.noteOff(AUDITION_CHANNEL, pitch, { time });
          } catch (error) {
            this.stopAudition();
            console.error(error);
            return;
          }
          this.auditionFence = Math.max(this.auditionFence, time);
          entry.ended = true;
          entry.cleanupTimer = setTimeout(() => {
            if (this.auditionState === entry) this.stopAudition();
          }, (ROOM.seconds + 0.1) * 1e3);
          try {
            entry.onEnd("ended");
          } catch (error) {
            console.error(error);
          }
        };
        entry.offTimer = setTimeout(release, Math.max(0, (end - context.currentTime) * 1e3));
      } catch (error) {
        this.stopAudition();
        throw error;
      }
      return { start, end, cancel: () => {
        if (this.auditionState === entry) this.stopAudition();
      } };
    }
    stopOverlapAudition() {
      const bus = this.overlapAudition;
      if (!bus) return;
      for (const entry of [...bus.entries]) entry.cancel();
    }
    auditionOverlap({ pitch, duration, velocity = 72, program = 0 }, onEnd = () => {
    }, onDispose = () => {
    }) {
      var _a2, _b2, _c2;
      program = auditionProgram(program);
      if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(velocity) || !Number.isInteger(program) || program < 0 || program > 127) throw new Error("Invalid audition note");
      if (typeof ((_b2 = (_a2 = this.synth.midiChannels) == null ? void 0 : _a2[AUDITION_CHANNEL]) == null ? void 0 : _b2.setDrums) !== "function") throw new Error("Audition channel unavailable");
      if (!this.overlapAudition) {
        this.stopAudition();
        const bus2 = { nodes: [], entries: /* @__PURE__ */ new Set(), connected: false, output: null };
        this.overlapAudition = bus2;
        try {
          const output = this.context.createGain();
          bus2.output = output;
          bus2.nodes.push(output);
          output.gain.value = 0;
          output.connect(this.context.destination);
          if (this.context.createConvolver && this.context.createBuffer) {
            (_c2 = this.roomBuffer) != null ? _c2 : this.roomBuffer = roomImpulse(this.context);
            const convolver = this.context.createConvolver(), wet = this.context.createGain();
            bus2.nodes.push(convolver, wet);
            convolver.normalize = false;
            convolver.buffer = this.roomBuffer;
            wet.gain.value = ROOM.wet;
            output.connect(convolver);
            convolver.connect(wet);
            wet.connect(this.context.destination);
          }
          bus2.connected = true;
          this.synth.connectChannel(output, AUDITION_CHANNEL);
        } catch (error) {
          this.overlapAudition = null;
          if (bus2.connected) try {
            this.synth.disconnectChannel(bus2.output, AUDITION_CHANNEL);
          } catch (e) {
          }
          for (const node of bus2.nodes) try {
            node.disconnect();
          } catch (e) {
          }
          throw error;
        }
      }
      const bus = this.overlapAudition, context = this.context;
      let channel = AUDITION_CHANNEL;
      while ([...bus.entries].some((entry2) => entry2.channel === channel)) channel += 16;
      if (channel >= this.synth.midiChannels.length) {
        if (typeof this.synth.addNewChannel !== "function") throw new Error("Audition polyphony unavailable");
        while (channel >= this.synth.midiChannels.length) this.synth.addNewChannel();
      }
      const start = Math.max(context.currentTime + 0.01, this.auditionFence + 5e-3), end = start + duration;
      const entry = { channel, offTimer: null, cleanupTimer: null, ended: false, cancel: null };
      bus.entries.add(entry);
      const finish = (reason) => {
        if (entry.ended) return;
        entry.ended = true;
        try {
          onEnd(reason);
        } catch (error) {
          console.error(error);
        }
      };
      const dispose = () => {
        if (!bus.entries.delete(entry)) return;
        clearTimeout(entry.offTimer);
        clearTimeout(entry.cleanupTimer);
        if (!bus.entries.size && this.overlapAudition === bus) {
          this.overlapAudition = null;
          if (bus.connected) try {
            this.synth.disconnectChannel(bus.output, AUDITION_CHANNEL);
          } catch (e) {
          }
          for (const node of bus.nodes) try {
            node.disconnect();
          } catch (e) {
          }
        }
        try {
          onDispose();
        } catch (error) {
          console.error(error);
        }
      };
      entry.cancel = () => {
        if (!bus.entries.has(entry)) return;
        const time = Math.max(context.currentTime, start, this.auditionFence) + 1e-3;
        this.auditionFence = time;
        try {
          this.synth.controllerChange(channel, 120, 0, { time });
        } catch (e) {
        }
        finish("cancelled");
        dispose();
      };
      try {
        if (bus.entries.size === 1) {
          bus.output.gain.setValueAtTime(0, start);
          if (bus.output.gain.linearRampToValueAtTime) bus.output.gain.linearRampToValueAtTime(MASTER_GAIN, start + 5e-3);
          else bus.output.gain.setValueAtTime(MASTER_GAIN, start);
        }
        this.synth.midiChannels[channel].setDrums(false);
        this.synth.controllerChange(channel, 121, 0, { time: start });
        for (const controller of [8, 71, 72, 73, 74, 75, 76, 77, 78, 81, 83]) this.synth.controllerChange(channel, controller, 64, { time: start });
        for (const controller of [100, 101]) this.synth.controllerChange(channel, controller, 127, { time: start });
        for (const [controller, value] of [[0, 0], [32, 0], [7, 100], [10, 64], [11, 127], [64, 0]]) this.synth.controllerChange(channel, controller, value, { time: start });
        this.synth.programChange(channel, program, { time: start });
        this.synth.noteOn(channel, pitch, Math.max(1, Math.min(127, Math.round(velocity))), { time: start });
        this.auditionFence = start;
        const release = () => {
          if (!bus.entries.has(entry)) return;
          entry.offTimer = null;
          if (context.currentTime < end) {
            entry.offTimer = setTimeout(release, Math.max(1, (end - context.currentTime) * 1e3));
            return;
          }
          try {
            this.synth.noteOff(channel, pitch, { time: context.currentTime });
          } catch (error) {
            entry.cancel();
            console.error(error);
            return;
          }
          finish("ended");
          entry.cleanupTimer = setTimeout(dispose, (ROOM.seconds + 0.1) * 1e3);
        };
        entry.offTimer = setTimeout(release, Math.max(0, (end - context.currentTime) * 1e3));
      } catch (error) {
        entry.cancel();
        throw error;
      }
      return { start, end, cancel: entry.cancel };
    }
    createClock(plan, start, offset = 0) {
      var _a2;
      const offsetTime = plan.timeAt(offset), end = (_a2 = plan.beats) != null ? _a2 : plan.beatAt(plan.duration);
      let previous = offset;
      const beat = () => {
        const now = presentationTime(this.context);
        if (now < start) return null;
        previous = Math.max(previous, Math.min(end, plan.beatAt(offsetTime + now - start)));
        return previous;
      };
      return { beat, position: () => {
        var _a3;
        return (_a3 = beat()) != null ? _a3 : offset;
      } };
    }
    stop() {
      this.stopAudition();
      clearInterval(this.interval);
      this.interval = null;
      for (const [mixer, convolver] of this.roomConnections) try {
        mixer.disconnect(convolver);
      } catch (e) {
      }
      for (const node of this.roomNodes) try {
        node.disconnect();
      } catch (e) {
      }
      this.roomConnections = [];
      this.roomNodes = [];
      const channels = new Set(this.connections.map(([channel]) => channel));
      for (const [channel, mixer] of this.connections) {
        try {
          this.synth.disconnectChannel(mixer, channel);
        } catch (e) {
        }
      }
      this.connections = [];
      this.synth.stopAll(true);
      if (channels.size) {
        const time = Math.max(this.context.currentTime, this.fence) + 1e-3;
        for (const channel of channels) this.synth.controllerChange(channel, 120, 0, { time });
        this.fence = time;
      }
    }
    play(plan, mixers, offset = 0, output = this.context.destination) {
      var _a2;
      if (plan.channels.some((channel) => channel.channel === AUDITION_CHANNEL)) throw new Error("Reserved audition channel");
      this.stop();
      const context = this.context, start = Math.max(context.currentTime + 0.045, this.fence + 0.025), offsetTime = plan.timeAt(offset);
      if (context.createConvolver && context.createBuffer) {
        (_a2 = this.roomBuffer) != null ? _a2 : this.roomBuffer = roomImpulse(context);
        const convolver = context.createConvolver(), wet = context.createGain();
        convolver.normalize = false;
        convolver.buffer = this.roomBuffer;
        wet.gain.value = ROOM.wet;
        this.roomNodes = [convolver, wet];
        convolver.connect(wet);
        wet.connect(output);
        for (const mixer of new Set(mixers)) {
          mixer.connect(convolver);
          this.roomConnections.push([mixer, convolver]);
        }
      }
      for (const channel of plan.channels) {
        this.synth.controllerChange(channel.channel, 120, 0, { time: start - 3e-3 });
        this.synth.connectChannel(mixers[channel.group], channel.channel);
        this.connections.push([channel.channel, mixers[channel.group]]);
      }
      const snapshotAt = (beat) => {
        var _a3;
        const snapshot = /* @__PURE__ */ new Map();
        for (const event of plan.events) if (event.beat <= beat && ["program", "cc"].includes(event.type)) snapshot.set([event.channel, event.type, (_a3 = event.controller) != null ? _a3 : ""].join(":"), { ...event, beat });
        return [...snapshot.values()];
      };
      const heldAt = (beat) => plan.notes.filter((n) => n.start < beat && n.end > beat).map((n) => ({ beat, type: "on", channel: n.channel, pitch: n.pitch, velocity: n.velocity }));
      const events = [...snapshotAt(offset), ...heldAt(offset), ...plan.events.filter((e) => e.beat >= offset && (e.type === "on" || e.type === "off") || e.beat > offset && e.type === "cc")];
      const priority = (e) => e.type === "cc" && [0, 32].includes(e.controller) ? -1 : { program: 0, cc: 1, off: 2, on: 3 }[e.type];
      events.sort((a, b) => a.beat - b.beat || priority(a) - priority(b));
      let cursor = 0;
      const send = (event, time) => {
        this.fence = Math.max(this.fence, time);
        const options2 = { time };
        if (event.type === "program") this.synth.programChange(event.channel, event.program, options2);
        else if (event.type === "cc") this.synth.controllerChange(event.channel, event.controller, event.value, options2);
        else if (event.type === "on") this.synth.noteOn(event.channel, event.pitch, event.velocity, options2);
        else this.synth.noteOff(event.channel, event.pitch, options2);
      };
      const pump = () => {
        const until = context.currentTime + HORIZON;
        if (cursor < events.length && start + plan.timeAt(events[cursor].beat) - offsetTime < context.currentTime - HORIZON) {
          const time = context.currentTime + 0.01, beat = plan.beatAt(offsetTime + time - start);
          for (const channel of plan.channels) this.synth.controllerChange(channel.channel, 120, 0, { time });
          [...snapshotAt(beat), ...heldAt(beat)].sort((a, b) => priority(a) - priority(b)).forEach((event) => send(event, time));
          while (cursor < events.length && events[cursor].beat < beat) cursor++;
        }
        while (cursor < events.length) {
          const event = events[cursor], time = start + (plan.timeAt(event.beat) - offsetTime);
          if (time > until) break;
          cursor++;
          send(event, time);
        }
        if (cursor === events.length) {
          clearInterval(this.interval);
          this.interval = null;
        }
      };
      this.interval = setInterval(pump, INTERVAL);
      pump();
      return start;
    }
  }
  async function prepare(context) {
    if (context.state === "closed") throw new Error("AudioContext closed");
    audioContext != null ? audioContext : audioContext = context;
    if (audioContext !== context) throw new Error("Shared AudioContext required");
    if (engine) return engine;
    if (pending) return pending.promise;
    const attempt = { controller: new AbortController(), synth: null, warmup: null, cleanup: [] }, signal = attempt.controller.signal;
    pending = attempt;
    lastError = null;
    function dispose() {
      var _a2;
      for (const cleanup of attempt.cleanup.splice(0)) try {
        cleanup();
      } catch (e) {
      }
      try {
        (_a2 = attempt.warmup) == null ? void 0 : _a2.disconnect();
      } catch (e) {
      }
      if (attempt.synth) {
        try {
          attempt.synth.destroy();
        } catch (e) {
        }
        attempt.synth = null;
      }
    }
    attempt.promise = (async () => {
      try {
        if (!context.audioWorklet) throw new Error("AudioWorklet unavailable");
        if (context.state && context.state !== "running") {
          phase = "resume";
          await bounded(context.resume(), 1e4, "resume", signal);
        }
        phase = "assets";
        const loadBank = async (url, lock) => {
          var _a2;
          const response = await fetch(url + (url.includes("?") ? "&" : "?") + "sha256=" + lock.sha256, { signal });
          if (!response.ok) throw new Error("SoundFont HTTP " + response.status);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length !== lock.bytes) throw new Error("SoundFont bank length " + bytes.length);
          if ((_a2 = global.crypto) == null ? void 0 : _a2.subtle) {
            const digest = await global.crypto.subtle.digest("SHA-256", bytes), hash = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("");
            if (hash !== lock.sha256) throw new Error("SoundFont bank checksum");
          }
          return bytes;
        };
        const banks = [{ url: resolveAsset("assets/soundfonts/GeneralUser-GS-v4.sf2.1"), name: "caplin", ...BANK }, ...additionalBanks];
        const [library, ...bankBytes] = await bounded(Promise.all([importLibrary(libraryUrl), ...banks.map((bank) => loadBank(bank.url, bank))]), 3e4, "assets", signal);
        phase = "module";
        await bounded(context.audioWorklet.addModule(workletUrl), 1e4, "module", signal);
        let fail;
        const failure = new Promise((_, reject) => {
          fail = (error) => reject(error instanceof Error ? error : new Error(String(error)));
        });
        failure.catch(() => {
        });
        const synth = new library.WorkletSynthesizer(context, { oneOutput: false, eventsEnabled: false, audioNodeCreators: { worklet(ctx, name, options2) {
          const node = new global.AudioWorkletNode(ctx, name, options2), processorError = () => fail(new Error("SoundFont worklet processor error")), messageError = () => fail(new Error("SoundFont worklet message error"));
          node.addEventListener("processorerror", processorError);
          node.port.addEventListener("messageerror", messageError);
          attempt.cleanup.push(() => {
            node.removeEventListener("processorerror", processorError);
            node.port.removeEventListener("messageerror", messageError);
          });
          return node;
        } } });
        attempt.synth = synth;
        synth.eventHandler.addEvent("soundBankError", "caplin-initialization", fail);
        attempt.cleanup.push(() => synth.eventHandler.removeEvent("soundBankError", "caplin-initialization"));
        const warmup = context.createGain();
        attempt.warmup = warmup;
        warmup.gain.value = 0;
        warmup.connect(context.destination);
        synth.connect(warmup);
        phase = "ready";
        await bounded(Promise.race([synth.isReady, failure]), 1e4, "ready", signal);
        synth.setLogLevel(false, false, false);
        for (let i = 0; i < banks.length; i++) {
          phase = "bank";
          await bounded(Promise.race([synth.soundBankManager.addSoundBank(bankBytes[i].buffer, banks[i].name), failure]), 1e4, i ? "additional bank" : "bank", signal);
        }
        if (signal.aborted) throw aborted();
        synth.setSystemParameter("effectsEnabled", false);
        synth.setSystemParameter("gain", 0.8);
        synth.disconnect(warmup);
        warmup.disconnect();
        attempt.warmup = null;
        for (const cleanup of attempt.cleanup.splice(0)) cleanup();
        engine = new ContinuousPlaybackEngine(context, synth);
        attempt.synth = null;
        phase = "ready";
        return engine;
      } catch (error) {
        attempt.controller.abort();
        dispose();
        if (pending === attempt) {
          phase = error.name === "AbortError" ? "idle" : "failed";
          lastError = String(error);
        }
        throw error;
      }
    })();
    try {
      return await attempt.promise;
    } finally {
      if (pending === attempt) pending = null;
    }
  }
  class ContinuousPlaybackEngine extends PlaybackEngine {
    constructor(context, synth) {
      super(context, synth);
      attachContinuousPlayback(this, { setInterval, clearInterval, presentationTime, horizon: HORIZON, interval: INTERVAL });
    }
  }
  function stop() {
    if (pending) {
      const attempt = pending;
      pending = null;
      attempt.controller.abort();
      phase = "idle";
    }
    engine == null ? void 0 : engine.stop();
  }
  return { prepare, stop, stopAudition: () => engine == null ? void 0 : engine.stopAudition(), getContext: () => audioContext, getPreparationState: () => ({ phase, pending: !!pending, error: lastError }), PlaybackEngine: ContinuousPlaybackEngine, presentationTime, soundingIntervals, room: ROOM, roomImpulse, masterGain: MASTER_GAIN };
}

// src/audio/transport.js
function createTransport({ makePlan, audio: providedAudio, onState = () => {
}, onPosition = () => {
}, onError = () => {
} } = {}) {
  if (typeof makePlan !== "function") throw new TypeError("makePlan is required");
  const audioEngine = () => providedAudio != null ? providedAudio : globalThis.SoundFontPlayback;
  let data = null, engine = null, context = null, clock = null, position = 0, tempo = 120, planTempo = 120, state = "idle", token = 0, frame = null, nodes = [], mixers = [], output = null, muted = /* @__PURE__ */ new Set(), auditionVoice = null, auditionGeneration = 0;
  const emit = (s) => {
    state = s;
    onState(s);
  };
  function disconnect() {
    for (const n of nodes) try {
      n.disconnect();
    } catch (e) {
    }
    nodes = [];
    mixers = [];
    output = null;
  }
  function cancel() {
    var _a;
    token++;
    cancelAnimationFrame(frame);
    frame = null;
    clock = null;
    auditionGeneration++;
    auditionVoice = null;
    (_a = audioEngine()) == null ? void 0 : _a.stop();
    disconnect();
  }
  function tick() {
    if (state !== "playing" || !clock) return;
    const beat = clock.beat();
    if (beat !== null) position = beat;
    onPosition(beat);
    if (beat !== null && beat >= data.beats - 1e-3) {
      cancel();
      position = 0;
      emit("idle");
      onPosition(null);
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  async function play() {
    var _a;
    if (!data) return;
    if (position >= data.beats) position = 0;
    const run = ++token;
    emit("loading");
    onPosition(null);
    try {
      const audio = audioEngine();
      if (!audio) throw Error("Playback engine missing");
      context != null ? context : context = (_a = audio.getContext()) != null ? _a : new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      await context.resume();
      if (run !== token) return;
      engine = await audio.prepare(context);
      if (run !== token) return;
      output = context.createGain();
      output.gain.value = 0.28;
      output.connect(context.destination);
      nodes = [output];
      mixers = [0, 1].map((i) => {
        const n = context.createGain();
        n.gain.value = muted.has(i) ? 0 : 1;
        n.connect(output);
        nodes.push(n);
        return n;
      });
      planTempo = tempo;
      const plan = makePlan(data, planTempo), start = engine.play(plan, mixers, position, output);
      clock = engine.createClock(plan, start, position);
      emit("playing");
      tick();
    } catch (error) {
      if (run !== token || error.name === "AbortError") return;
      cancel();
      emit("error");
      onError(error);
    }
  }
  function pause() {
    if (clock) position = clock.position();
    cancel();
    emit("paused");
    onPosition(null);
  }
  function stop() {
    cancel();
    position = 0;
    emit("idle");
    onPosition(null);
  }
  function seek(beat) {
    var _a;
    const resume = state === "playing";
    if (clock) position = clock.position();
    cancel();
    position = Math.max(0, Math.min((_a = data == null ? void 0 : data.beats) != null ? _a : 0, beat));
    onPosition(null);
    if (resume) void play();
    else emit("paused");
  }
  return {
    load(next) {
      stop();
      data = next;
      tempo = next.tempo;
      muted.clear();
    },
    play,
    pause,
    stop,
    seek,
    toggle() {
      if (state === "playing" || state === "loading") pause();
      else return play();
    },
    setTempo(value) {
      const next = Math.max(40, Math.min(260, Number(value) || 120));
      if (clock) position = clock.position();
      tempo = next;
      if (state === "playing") engine.setRate(next / planTempo);
    },
    setMuted(voice, value) {
      var _a;
      if (value) muted.add(voice);
      else muted.delete(voice);
      if (mixers[voice]) mixers[voice].gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 8e-3);
      if (value && auditionVoice === voice) {
        auditionGeneration++;
        (_a = engine == null ? void 0 : engine.stopAudition) == null ? void 0 : _a.call(engine);
        auditionVoice = null;
      }
    },
    async audition(note) {
      var _a, _b, _c, _d, _e;
      const run = token, voice = (_a = note.voice) != null ? _a : 0;
      if (muted.has(voice)) return;
      try {
        const audio = audioEngine();
        context != null ? context : context = (_b = audio.getContext()) != null ? _b : new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        await context.resume();
        engine = await audio.prepare(context);
        if (run !== token || muted.has(voice)) return;
        const supplied = (_d = (_c = data == null ? void 0 : data.voices) == null ? void 0 : _c.find((v) => v.voice === voice)) == null ? void 0 : _d.program, program = Number.isInteger(supplied) && supplied >= 0 && supplied <= 127 ? supplied : voice === 1 ? 65 : 0;
        const audition = ++auditionGeneration;
        auditionVoice = voice;
        engine.audition({ pitch: note.pitch, duration: Math.min(2, note.duration * 60 / tempo), velocity: (_e = note.velocity) != null ? _e : voice === 1 ? 80 : 74, program }, () => {
          if (audition === auditionGeneration) auditionVoice = null;
        });
      } catch (error) {
        if (run === token && error.name !== "AbortError") onError(error);
      }
    },
    destroy() {
      stop();
      data = null;
    },
    get state() {
      return state;
    },
    get position() {
      return position;
    },
    get tempo() {
      return tempo;
    },
    get data() {
      return data;
    },
    get mutedVoices() {
      return [...muted];
    }
  };
}

// src/audio/tempo-keys.js
function bindTempoKeys({ target = globalThis.document, adjustTempo, enabled = () => true }) {
  const deltas = { "-": -0.1, "=": 0.1, "_": -0.01, "+": 0.01 };
  const keydown = (event) => {
    var _a, _b;
    const delta = deltas[event.key], element = event.target;
    if (delta === void 0 || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !enabled()) return;
    if ((_a = element == null ? void 0 : element.closest) == null ? void 0 : _a.call(element, 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog[open]')) return;
    if ((_b = target.querySelector) == null ? void 0 : _b.call(target, "dialog[open]")) return;
    if (adjustTempo(delta, event) !== false) event.preventDefault();
  };
  target.addEventListener("keydown", keydown);
  return () => target.removeEventListener("keydown", keydown);
}
