import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useNotePlaybackClock} from 'librawl/native';
import {bindPlaybackKeys} from '../audio/playback-keys.js';
import {RawlNotation} from '../notation/RawlNotation.jsx';
import {PlaybackFooter} from './PlaybackFooter.jsx';
import {observePlaybackPosition} from './playback-position.js';

const activeByDocument = new WeakMap();

/** Keep a new source's initial clock and controls independent of the old media. */
export function MediaScore(props) {
  if (!Number.isFinite(props.secondsPerBeat) || props.secondsPerBeat <= 0) {
    throw new RangeError('MediaScore needs a positive secondsPerBeat');
  }
  return <MediaScorePlayer key={props.src} {...props} />;
}

function MediaScorePlayer({score, src, secondsPerBeat, label, labels}) {
  const mediaRef = useRef(null);
  const controlsRef = useRef(null);
  const clock = useNotePlaybackClock();
  const scoreDuration = score.beats * secondsPerBeat;
  const [status, setStatus] = useState({
    duration: scoreDuration, position: 0, playing: false, failed: false, rejected: false,
  });
  const timeline = useMemo(() => ({
    sections: score.rows?.map(row => row.start * secondsPerBeat),
    phrases: score.phraseStarts?.map(beat => beat * secondsPerBeat),
  }), [score.rows, score.phraseStarts, secondsPerBeat]);

  useLayoutEffect(() => {
    const media = mediaRef.current;
    const document = media.ownerDocument;
    let stopFrames;
    let positioned = false;
    let rejected = false;
    let attempt = 0;
    const owner = {stop};
    const keys = bindPlaybackKeys({target: document, pause: () => media.pause()});
    const duration = () => Number.isFinite(media.duration) ? media.duration : scoreDuration;

    function publish() {
      setStatus({
        duration: duration(), position: media.currentTime,
        playing: !media.paused && !media.ended && !media.error,
        failed: !!media.error, rejected,
      });
    }

    function paintNotes(seconds) {
      if (positioned) clock.advance(seconds / secondsPerBeat);
    }

    function settle() {
      stopFrames?.();
      stopFrames = undefined;
      keys.setActive(false);
    }

    function release() {
      if (activeByDocument.get(document) === owner) activeByDocument.delete(document);
    }

    function stop() {
      ++attempt;
      settle();
      release();
      positioned = false;
      rejected = false;
      media.pause();
      media.currentTime = 0;
      clock.reset();
      publish();
    }

    function seek(seconds) {
      if (!Number.isFinite(seconds) || media.error) return;
      positioned = true;
      media.currentTime = Math.max(0, Math.min(duration(), seconds));
      paintNotes(media.currentTime);
      publish();
    }

    function start(seconds) {
      if (media.error) return;
      const active = activeByDocument.get(document);
      if (active && active !== owner) active.stop();
      activeByDocument.set(document, owner);
      rejected = false;
      if (seconds !== undefined || media.ended) seek(seconds ?? 0);
      const generation = ++attempt;
      media.play().catch(error => {
        if (generation !== attempt || error.name === 'AbortError') return;
        stop();
        rejected = true;
        publish();
      });
    }

    controlsRef.current = {
      seek, start, stop,
      toggle() {
        if (media.paused || media.ended) start();
        else media.pause();
      },
    };
    const events = {
      play: publish,
      playing() {
        positioned = true;
        stopFrames?.();
        stopFrames = observePlaybackPosition(() => media.currentTime, paintNotes);
        keys.setActive(true);
        publish();
      },
      pause() {
        settle();
        paintNotes(media.currentTime);
        publish();
      },
      ended: stop,
      error() {
        ++attempt;
        settle();
        release();
        positioned = false;
        clock.reset();
        publish();
      },
      seeked() {
        paintNotes(media.currentTime);
        publish();
      },
      loadedmetadata: publish,
      durationchange: publish,
    };
    for (const [name, listener] of Object.entries(events)) media.addEventListener(name, listener);
    document.defaultView?.addEventListener('pagehide', stop);
    publish();
    return () => {
      ++attempt;
      settle();
      keys.destroy();
      release();
      for (const [name, listener] of Object.entries(events)) media.removeEventListener(name, listener);
      document.defaultView?.removeEventListener('pagehide', stop);
      controlsRef.current = null;
      if (!media.paused) media.pause();
      clock.reset();
    };
  }, [clock, scoreDuration, secondsPerBeat]);

  const seekBeat = useCallback(beat => controlsRef.current?.start(beat * secondsPerBeat), [secondsPerBeat]);
  const getPosition = useCallback(() => mediaRef.current?.currentTime ?? 0, []);
  return (
    <div className="rawlp-media-score" role={label ? 'group' : undefined} aria-label={label}>
      <audio hidden src={src} ref={mediaRef} preload="metadata" />
      {label && <div className="rawlp-media-score-label">{label}</div>}
      <RawlNotation {...score} position={undefined} playbackClock={clock} onSeek={seekBeat} />
      <PlaybackFooter
        position={status.position} duration={status.duration} playing={status.playing}
        inline labels={labels} timeline={timeline} keyboardShortcuts={false}
        disabled={status.failed} stopDisabled={!status.playing && status.position === 0}
        getPosition={getPosition} onTogglePlay={() => controlsRef.current?.toggle()}
        onSeek={seconds => controlsRef.current?.seek(seconds)} onStop={() => controlsRef.current?.stop()}
      />
      {(status.failed || status.rejected) && (
        <div className="rawlp-media-score-error" role="status">{labels?.error ?? 'Audio unavailable'}</div>
      )}
    </div>
  );
}
