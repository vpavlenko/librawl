/*! librawl version: 0.4.1-local; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/audio/native/ThreadedMIDIPlayer.ts
function createThreadedMIDIPlayerClass(environment) {
  var _a;
  const { EventEmitter } = environment;
  const console = (_a = environment.console) != null ? _a : globalThis.console;
  return class ThreadedMIDIPlayer extends EventEmitter {
    constructor(context, debugTiming = false) {
      super();
      __publicField(this, "worker");
      __publicField(this, "node");
      __publicField(this, "context");
      __publicField(this, "nextId", 0);
      __publicField(this, "latestLoadId", 0);
      __publicField(this, "generation", 0);
      __publicField(this, "disposed", false);
      __publicField(this, "failed", false);
      __publicField(this, "pending", /* @__PURE__ */ new Map());
      __publicField(this, "clock", null);
      __publicField(this, "playbackStartedCallback", null);
      __publicField(this, "waitingForStart", false);
      __publicField(this, "debugTiming");
      __publicField(this, "state", {
        durationMs: 0,
        positionMs: 0,
        numVoices: 0,
        tempo: 1,
        voiceMask: [],
        voiceNames: [],
        isStopped: true,
        isPlaying: false,
        isPaused: true
      });
      __publicField(this, "lastUnderruns", 0);
      this.context = context;
      this.debugTiming = debugTiming;
      this.getPositionMs = this.getPositionMs.bind(this);
    }
    async initialize(destination) {
      if (!this.context.audioWorklet) {
        throw new Error("MIDI playback requires AudioWorklet support and HTTPS (or localhost).");
      }
      const assetBase = typeof environment.assetBase === "function" ? environment.assetBase() : environment.assetBase;
      try {
        await this.context.audioWorklet.addModule(new URL("midi-output-worklet.js", assetBase).href);
        if (this.disposed) throw new Error("Audio engine disposed.");
        this.node = new environment.AudioWorkletNode(this.context, "rawl-midi-output", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2]
        });
        this.node.port.onmessage = ({ data }) => this.receiveAudio(data);
        this.node.onprocessorerror = () => this.fail(new Error("The audio output processor stopped. Reload to restart audio."));
        this.node.connect(destination);
        this.worker = environment.createWorker();
        this.worker.onmessage = ({ data }) => this.receiveWorker(data);
        this.worker.onerror = (event) => this.fail(new Error(event.message || "The MIDI synthesis worker stopped."));
        const channel = new environment.MessageChannel();
        this.node.port.postMessage({ type: "connect", port: channel.port1 }, [channel.port1]);
        await this.request({
          type: "init",
          assetBase,
          sampleRate: this.context.sampleRate,
          port: channel.port2
        }, [channel.port2]);
      } catch (error) {
        this.dispose();
        throw error;
      }
    }
    request(message, transfer = []) {
      if (this.disposed || this.failed) return Promise.reject(new Error("Audio engine is unavailable."));
      const id = ++this.nextId;
      if (message.method === "loadData") this.latestLoadId = id;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        try {
          this.worker.postMessage({ ...message, id }, transfer);
        } catch (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    }
    receiveWorker(message) {
      if (message.type === "error") {
        this.fail(new Error(message.message));
        return;
      }
      if (message.type === "state") {
        if (message.commandId === this.nextId) {
          this.state = { ...this.state, ...message.state };
          this.emit("playerStateUpdate", this.state);
        }
      } else if (message.type === "reply") {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error));
        else {
          if (message.id === this.latestLoadId) {
            const { durationMs, numVoices, voiceNames, metadata } = message.state;
            Object.assign(this.state, { durationMs, numVoices, voiceNames, metadata });
          }
          if (message.id === this.nextId) this.state = { ...this.state, ...message.state };
          pending.resolve(message.result);
        }
      }
    }
    receiveAudio(message) {
      var _a2;
      if (message.generation !== this.generation || this.failed) return;
      if (message.type === "position") {
        this.clock = message;
        if (this.waitingForStart && message.speed > 0) {
          this.waitingForStart = false;
          (_a2 = this.playbackStartedCallback) == null ? void 0 : _a2.call(this);
          this.playbackStartedCallback = null;
        }
        if (this.debugTiming && message.underruns !== this.lastUnderruns) {
          this.lastUnderruns = message.underruns;
          console.debug("[midi timing] output underruns:", message.underruns);
        }
      } else if (message.type === "ended") {
        this.state = { ...this.state, isPlaying: false, isPaused: true, isStopped: true };
        this.emit("playerStateUpdate", this.state);
      }
    }
    invalidate(positionMs) {
      var _a2;
      this.generation++;
      this.clock = null;
      this.state.positionMs = positionMs;
      (_a2 = this.node) == null ? void 0 : _a2.port.postMessage({ type: "invalidate", generation: this.generation, positionMs });
      return this.generation;
    }
    control(method, args = [], positionMs) {
      const generation = positionMs === void 0 ? void 0 : this.invalidate(positionMs);
      return this.request({ type: "command", method, args, generation });
    }
    send(method, args = [], positionMs) {
      void this.control(method, args, positionMs).catch((error) => {
        if (!this.failed && !this.disposed) this.fail(error);
      });
    }
    async loadData(data, filepath, shouldAutoPlay = true, excludedVoices = [], drumVoices = [], transpose = 0, timbre) {
      this.state.isPlaying = shouldAutoPlay;
      this.state.isPaused = !shouldAutoPlay;
      this.waitingForStart = shouldAutoPlay;
      return this.control("loadData", [data, filepath, shouldAutoPlay, excludedVoices, drumVoices, transpose, timbre], 0);
    }
    isPlaying() {
      return this.state.isPlaying;
    }
    isPaused() {
      return !this.isPlaying();
    }
    getDurationMs() {
      return this.state.durationMs;
    }
    getTempo() {
      return this.state.tempo;
    }
    getNumVoices() {
      return this.state.numVoices;
    }
    getVoiceMask() {
      return this.state.voiceMask;
    }
    getVoiceName(index) {
      return this.state.voiceNames[index];
    }
    getMetadata() {
      return this.state.metadata;
    }
    getPositionMs() {
      if (!this.clock) return this.state.positionMs;
      const { positionMs, contextTime, speed, limitMs } = this.clock;
      return Math.min(limitMs, positionMs + Math.max(0, this.context.currentTime - contextTime) * 1e3 * speed);
    }
    togglePause() {
      if (this.isPlaying()) this.pause();
      else {
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.waitingForStart = true;
        this.send("resume", [], this.getPositionMs());
      }
      return !this.isPlaying();
    }
    pause() {
      const positionMs = this.getPositionMs();
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.waitingForStart = false;
      this.send("pause", [positionMs], positionMs);
    }
    stop() {
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.state.isStopped = true;
      this.waitingForStart = false;
      this.send("stop", [], 0);
    }
    suspend() {
      this.stop();
    }
    eject() {
      this.stop();
    }
    seekMs(ms) {
      if (!Number.isFinite(ms) || ms < 0 || ms > this.getDurationMs()) return;
      this.send("seekMs", [ms], ms);
    }
    setTempo(tempo) {
      this.state.tempo = Math.max(0.1, Math.min(4, tempo));
      this.send("setTempo", [this.state.tempo]);
    }
    setVoiceMask(mask) {
      this.state.voiceMask = [...mask];
      this.send("setVoiceMask", [mask]);
    }
    setDrumVoices(voices) {
      this.send("setDrumVoices", [voices]);
    }
    setForcedPanning(enabled) {
      this.send("setForcedPanning", [enabled]);
    }
    setTranspose(semitones) {
      this.send("setTranspose", [semitones]);
    }
    setParameter(id, value) {
      this.send("setParameter", [id, value], id === "soundfont" ? this.getPositionMs() : void 0);
    }
    async loadSoundfont(name, data) {
      return this.control("loadSoundfont", [name, data], this.getPositionMs());
    }
    setPlaybackStartedCallback(callback) {
      this.playbackStartedCallback = callback || null;
    }
    fail(error) {
      var _a2;
      if (this.failed || this.disposed) return;
      console.error("[midi playback]", error);
      this.failed = true;
      this.invalidate(this.getPositionMs());
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.pending.forEach(({ reject }) => reject(error));
      this.pending.clear();
      (_a2 = this.worker) == null ? void 0 : _a2.terminate();
      this.emit("playerStateUpdate", { isStopped: true, isPlaying: false });
      this.emit("playerError", error.message);
    }
    dispose() {
      var _a2, _b, _c;
      this.disposed = true;
      (_a2 = this.worker) == null ? void 0 : _a2.terminate();
      (_b = this.node) == null ? void 0 : _b.disconnect();
      (_c = this.node) == null ? void 0 : _c.port.close();
      this.pending.forEach(({ reject }) => reject(new Error("Audio engine disposed.")));
      this.pending.clear();
    }
  };
}
export {
  createThreadedMIDIPlayerClass
};
