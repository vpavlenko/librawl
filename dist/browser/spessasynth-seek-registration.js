// Evaluated before the pinned SpessaSynth 4.3.14 worklet. Keep its output,
// bank loading and renderer, and add cancellation to its MIDI message queue.
const register = globalThis.registerProcessor;
globalThis.registerProcessor = (name, BaseProcessor) => {
  globalThis.registerProcessor = register;
  register.call(globalThis, name, BaseProcessor);
  register.call(globalThis, 'librawl-' + name, class extends BaseProcessor {
    constructor(options) {
      super(options);
      const {core} = this;
      const handleMessage = core.handleMessage.bind(core);
      core.handleMessage = message => {
        if (message.type !== 'librawlClearMidi') return handleMessage(message);
        const synth = core.synthesizer.synthCore;
        if (!message.channels) {
          synth.eventQueue.length = 0;
          return;
        }
        const channels = new Set(message.channels);
        synth.eventQueue = synth.eventQueue.filter(({message: midi, channelOffset}) =>
          midi[0] >= 0xf0 || !channels.has(channelOffset + (midi[0] & 0x0f)));
        for (const channel of channels) synth.midiChannels[channel]?.stopAllNotes(true);
      };
    }
  });
};
