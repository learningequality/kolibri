/* global jest */
/**
 * Shared video.js test double.
 *
 * video.js needs a real media element and browser media APIs that jsdom cannot
 * provide, so it is the hard boundary to fake. Faking it here lets tests drive
 * the REAL composables (useMediaPlayer / useCaptions / useMediaProgress) instead
 * of mocking those internal modules.
 *
 * Usage in a spec:
 *
 *   jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
 *   import videojs from 'video.js';
 *   // after the player initializes:
 *   const player = videojs.mock.results.at(-1).value;
 *   player.trigger('play');
 */

import { nextTick } from 'vue';

/**
 * Advance past the player's async ready sequence: Vue nextTick runs initPlayer's
 * videojs() call + setPlayer, then a microtask fires handleReadyPlayer.
 * @returns {Promise<void>} Resolves once the player is ready
 */
export async function flushPlayerReady() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

/**
 * Default video.js formatTime implementation (mm:ss), matching video.js output
 * closely enough for assertions.
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted "m:ss" string
 */
export function formatTime(seconds) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Build a fake TextTrack with only the surface useCaptions touches.
 * @param {object} opts - Track options
 * @param {string} opts.language - BCP-47 language code
 * @param {string} [opts.id] - Track id (defaults to the language)
 * @param {string} [opts.mode] - Initial mode ('disabled' | 'hidden' | 'showing')
 * @param {Array} [opts.cues] - Cue objects for the track
 * @param {Array} [opts.activeCues] - Currently active cue objects
 * @returns {object} A fake TextTrack
 */
export function createTrack({ language, id, mode = 'disabled', cues = [], activeCues = [] }) {
  const listeners = {};
  const track = {
    id: id || language,
    language,
    mode,
    cues,
    activeCues,
    addCue: jest.fn(),
    addEventListener: (event, cb) => {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    removeEventListener: (event, cb) => {
      listeners[event] = (listeners[event] || []).filter(l => l !== cb);
    },
    // Test helper: fire a track event (e.g. 'cuechange').
    trigger: event => (listeners[event] || []).slice().forEach(cb => cb()),
  };
  return track;
}

/**
 * Build a fake TextTrackList (array-like, as video.js returns).
 * @param {Array} tracks - Tracks to include
 * @returns {Array} An array of tracks (array-like list)
 */
export function createTrackList(tracks = []) {
  return tracks;
}

// The event each piece of player state announces when written, as video.js does.
const STATE_EVENTS = {
  currentTime: 'timeupdate',
  duration: 'durationchange',
  volume: 'volumechange',
  muted: 'volumechange',
  playbackRate: 'ratechange',
};

/**
 * Build a fake video.js Player exposing only the surface the media_player
 * composables call. Events are dispatched via `trigger(event)`.
 * @param {object} [overrides] - Initial state / method overrides
 * @returns {object} A fake video.js player
 */
export function createFakePlayer(overrides = {}) {
  const listeners = {};
  const state = {
    currentTime: 0,
    duration: 0,
    paused: true,
    seeking: false,
    volume: 1,
    muted: false,
    playbackRate: 1,
    textTracks: createTrackList(),
    ...overrides,
  };

  // video.js getter/setter methods, which announce writes with an event.
  const accessor = key => value => {
    if (value === undefined) {
      return state[key];
    }
    state[key] = value;
    player.trigger(STATE_EVENTS[key]);
    return undefined;
  };

  const player = {
    on: (event, cb) => {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    one: (event, cb) => {
      const wrapped = (...args) => {
        player.off(event, wrapped);
        cb(...args);
      };
      player.on(event, wrapped);
    },
    off: (event, cb) => {
      listeners[event] = (listeners[event] || []).filter(l => l !== cb);
    },
    // Test helper: dispatch a player event to its listeners.
    trigger: (event, ...args) => (listeners[event] || []).slice().forEach(cb => cb(...args)),

    currentTime: accessor('currentTime'),
    duration: accessor('duration'),
    volume: accessor('volume'),
    muted: accessor('muted'),
    playbackRate: accessor('playbackRate'),
    seeking: () => state.seeking,
    paused: () => state.paused,
    play: jest.fn(() => {
      state.paused = false;
      player.trigger('play');
      return Promise.resolve();
    }),
    pause: jest.fn(() => {
      state.paused = true;
      player.trigger('pause');
    }),
    textTracks: () => state.textTracks,
    // Test helper: attach a text-track list, then trigger('loadstart') to bind it.
    _setTextTracks: list => {
      state.textTracks = list;
    },
    isDisposed: () => state.disposed === true,
    dispose: jest.fn(() => {
      state.disposed = true;
    }),
    // video.js control/DOM surface used by VideoPlayer; harmless no-ops here.
    addClass: jest.fn(),
    removeClass: jest.fn(),
    addChild: jest.fn(),
    // Child lookups return a childless stub: consumers chain getChild and then
    // guard on the missing grandchild (MediaPlayerFullscreen's toggle lookup).
    getChild: jest.fn(() => ({ getChild: () => undefined })),
    controlBar: { getChild: jest.fn() },
    ...overrides.methods,
  };
  return player;
}

/**
 * Put a fake player into a given state, firing the events a real player would.
 * @param {object} player - Fake player from createFakePlayer
 * @param {object} [state] - State to apply
 * @param {boolean} [state.paused] - Whether playback is paused
 * @param {number} [state.currentTime] - Playback position in seconds
 * @param {number} [state.duration] - Media duration in seconds
 * @param {number} [state.volume] - Volume, 0-1
 * @param {boolean} [state.muted] - Whether audio is muted
 * @param {number} [state.playbackRate] - Playback speed multiplier
 */
export function setPlayerState(player, { paused, ...values } = {}) {
  for (const [key, value] of Object.entries(values)) {
    player[key](value);
  }
  if (paused === true) {
    player.pause();
  } else if (paused === false) {
    player.play();
  }
}

/**
 * Stand-in for any video.js component class returned by `videojs.getComponent`.
 */
class FakeComponent {
  constructor(player) {
    this._player = player;
  }
  player() {
    return this._player;
  }
  el() {
    return document.createElement('div');
  }
  controlText() {}
  buildCSSClass() {
    return '';
  }
  on() {}
  off() {}
  dispose() {}
  handleSelectedLanguageChange() {}
}

/**
 * Build the mocked `video.js` module object for a jest.mock factory. The default
 * export is a jest.fn videojs(); read the created player from
 * `videojs.mock.results.at(-1).value`.
 *
 * The ready callback is invoked asynchronously (as real video.js does, after
 * `videojs()` returns) so useMediaPlayer's setPlayer has assigned `player.value`
 * before handleReadyPlayer runs.
 * @returns {object} A mocked video.js module ({ __esModule, default })
 */
export function videojsModuleMock() {
  const videojs = jest.fn((el, config, ready) => {
    // Model the DOM half of video.js: it moves the media element into a
    // generated wrapper, and dispose() removes that wrapper — the media element
    // with it (Component.dispose, video.cjs.js:3937). Without this a player
    // rebuilt into a detached tree still looks fine to the tests.
    let wrapper = null;
    if (el && el.parentNode) {
      wrapper = document.createElement('div');
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    }
    const player = createFakePlayer();
    const disposePlayer = player.dispose;
    player.dispose = jest.fn(() => {
      disposePlayer();
      wrapper?.parentNode?.removeChild(wrapper);
    });
    if (ready) {
      // Don't fire ready on a player disposed before the microtask runs (e.g.
      // the component unmounted first), matching real video.js.
      Promise.resolve().then(() => {
        if (!player.isDisposed()) {
          ready.call(player);
        }
      });
    }
    return player;
  });
  // Components are subclassed at module load (customButtons, the videojs mixins),
  // so this must be constructable, with the surface those subclasses call through to.
  videojs.getComponent = () => FakeComponent;
  videojs.registerComponent = jest.fn();
  videojs.formatTime = formatTime;
  return { __esModule: true, default: videojs };
}
