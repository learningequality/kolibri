import { computed, onUnmounted } from 'vue';
import videojs from 'video.js';
import mediaStrings from '../utils/mediaStrings';
import { PLAYBACK_RATES, injectMediaPlayer } from './useMediaPlayer';

/**
 * Composable for seek bar interaction logic used by AudioPlayerControls.
 * @typedef {object} SeekBarApi
 * @param {import('vue').Ref} progressBarRef - template ref to the progress bar element
 * @property {import('vue').Ref<number>} currentTime Current playback position in seconds.
 * @property {import('vue').Ref<number>} duration Total media duration in seconds.
 * @property {import('vue').Ref<boolean>} isPlaying Whether media is currently playing.
 * @property {import('vue').Ref<boolean>} muted Whether audio is muted.
 * @property {import('vue').Ref<number>} playbackRate Playback speed multiplier.
 * @property {import('vue').ComputedRef<number>} progressPercent Progress as 0–100.
 * @property {import('vue').ComputedRef<string>} formattedCurrentTime Human-readable
 * current time (e.g. "1:23").
 * @property {import('vue').ComputedRef<string>} formattedDuration Human-readable total
 * duration.
 * @property {import('vue').ComputedRef<string>} playbackRateLabel Localized rate label
 * with multiplier sign (e.g. "1.5×").
 * @property {() => void} togglePlay Toggle play/pause.
 * @property {(seconds?: number) => void} rewind Rewind by seconds (default 10).
 * @property {(seconds?: number) => void} forward Fast-forward by seconds (default 10).
 * @property {() => void} toggleMute Mute or unmute the audio.
 * @property {() => void} cyclePlaybackRate Advance to the next rate in PLAYBACK_RATES.
 * @property {(event: MouseEvent) => void} onProgressMouseDown Mouse-drag seek handler.
 * @property {(event: TouchEvent) => void} onProgressTouchStart Touch-drag seek handler.
 * @property {(event: KeyboardEvent) => void} onProgressKeyDown Keyboard seek handler
 * (arrows, Home, End).
 * @returns {SeekBarApi} Seek bar state and interaction handlers.
 */
export default function useSeekBar(progressBarRef) {
  const {
    currentTime,
    duration,
    isPlaying,
    muted,
    playbackRate,
    togglePlay,
    seek,
    rewind,
    forward,
    toggleMute,
    setPlaybackRate,
  } = injectMediaPlayer();

  const progressPercent = computed(() => {
    if (!duration.value) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  const formattedCurrentTime = computed(() => {
    return videojs.formatTime(currentTime.value, duration.value);
  });

  const formattedDuration = computed(() => {
    return videojs.formatTime(duration.value, duration.value);
  });

  const playbackRateLabel = computed(() => {
    return mediaStrings.playbackRateLabel$({ rate: playbackRate.value });
  });

  function cyclePlaybackRate() {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate.value);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  }

  function getSeekFraction(clientX) {
    if (!progressBarRef.value) return 0;
    const rect = progressBarRef.value.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  // Cleanup for an in-progress drag, so document listeners are removed even if
  // the component unmounts mid-drag (before mouseup/touchend fires).
  let endActiveDrag = null;

  function onProgressMouseDown(event) {
    seek(getSeekFraction(event.clientX) * duration.value);

    const onMouseMove = e => {
      seek(getSeekFraction(e.clientX) * duration.value);
    };
    endActiveDrag = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', endActiveDrag);
      endActiveDrag = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', endActiveDrag);
  }

  function onProgressTouchStart(event) {
    seek(getSeekFraction(event.touches[0].clientX) * duration.value);

    const onTouchMove = e => {
      // Prevent the page/container from scrolling while dragging the seek bar.
      // Requires the listener to be registered as non-passive.
      e.preventDefault();
      seek(getSeekFraction(e.touches[0].clientX) * duration.value);
    };
    endActiveDrag = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', endActiveDrag);
      endActiveDrag = null;
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', endActiveDrag);
  }

  onUnmounted(() => {
    if (endActiveDrag) {
      endActiveDrag();
    }
  });

  function onProgressKeyDown(event) {
    const step = 5;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      forward(step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      rewind(step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      seek(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      seek(duration.value);
    }
  }

  return {
    currentTime,
    duration,
    isPlaying,
    muted,
    playbackRate,
    progressPercent,
    formattedCurrentTime,
    formattedDuration,
    playbackRateLabel,
    togglePlay,
    rewind,
    forward,
    toggleMute,
    cyclePlaybackRate,
    onProgressMouseDown,
    onProgressTouchStart,
    onProgressKeyDown,
  };
}
