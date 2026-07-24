import {
  ref,
  computed,
  provide,
  inject,
  readonly,
  markRaw,
  onBeforeUnmount,
  onMounted,
  watch,
  nextTick,
} from 'vue';
import videojs from 'video.js';
import mapValues from 'lodash/mapValues';
import { useIntervalFn, useThrottleFn } from '@vueuse/core';
import useContentViewer from 'kolibri/composables/useContentViewer';
import useScrollContainer from 'kolibri-common/composables/useScrollContainer';
import Settings from '../utils/settings';
import customExtractors from '../utils/fileExtractors';
import useMediaProgress from './useMediaProgress';
import useCaptions from './useCaptions';

const MEDIA_PLAYER_CONTEXT_KEY = 'mediaPlayerContext';

/**
 * Available playback rate options for audio/video players
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/**
 * Composable for managing media player state, progress tracking, and content viewer integration.
 * Creates instance-specific state that can be safely used with multiple players.
 *
 * This composable integrates useContentViewer internally, so components using it
 * do not need to call useContentViewer separately.
 * @param {object} context - Vue component context ({ emit })
 * @param {object} options - Configuration options
 * @param {import('vue').Ref} [options.rootEl] - Root element ref for scroll container detection
 * @param {import('vue').Ref} options.wrapperRef - Wrapper element ref for first-interaction play
 * @param {import('vue').Ref} options.playerRef - The <video>/<audio> element ref for videojs.
 * Its parent element must be keyed on the source url: video.js removes the tag
 * it wrapped when the player is disposed, so re-init needs a fresh one.
 * @param {Function} options.getPlayerConfig - Returns the videojs config object; called
 * at init time so it can read component-specific state
 * @param {Function} [options.onReady] - Callback after player is ready,
 * for component-specific setup
 * @returns {object} Media player API for the parent component. Playback state is
 * returned as raw refs here; descendants get readonly copies (see injectMediaPlayer):
 *   - player {Ref} - The video.js player instance, null until ready
 *   - defaultFile {ComputedRef} - The primary media file
 *   - files {ComputedRef<Array>} - All files for the content node
 *   - supplementaryFiles {ComputedRef<Array>} - Non-primary files (e.g. VTT tracks)
 *   - thumbnailFiles {ComputedRef<Array>} - Thumbnail files
 *   - extraFields {Ref<object>} - Content session extra fields, including contentState
 *   - embedded {Ref<boolean>} - Whether the player is embedded (suppresses autoplay)
 *   - captionTracks {ComputedRef<Array>} - Available caption tracks
 *   - transcript {Readonly<Ref<boolean>>} - Whether the transcript is shown
 *   - toggleTranscript {Function} - Toggle the transcript on/off
 *   - trackSources {ComputedRef<Array>} - VTT files to render as <track> sources
 *   - isDefaultTrack {Function} - Check if a language is the default track
 *   - loading {Ref<boolean>} - True until the player is ready
 *   - currentTime {Ref<number>} - Playback position in seconds
 *   - duration {Ref<number>} - Media duration in seconds
 *   - isPlaying {Ref<boolean>} - Whether playback is running
 *   - volume {Ref<number>} - Volume, 0-1
 *   - muted {Ref<boolean>} - Whether audio is muted
 *   - playbackRate {Ref<number>} - Playback speed multiplier
 *   - isBuffering {Ref<boolean>} - Whether playback is stalled buffering
 *   - togglePlay {Function} - Play if paused, pause if playing
 *   - seek {Function} - Seek to a position in seconds
 *   - rewind {Function} - Seek backwards (default 10s)
 *   - forward {Function} - Seek forwards (default 10s)
 *   - setVolume {Function} - Set volume, 0-1
 *   - toggleMute {Function} - Toggle mute
 *   - setPlaybackRate {Function} - Set the playback speed multiplier
 */
export default function useMediaPlayer(
  context,
  { rootEl, wrapperRef, playerRef, getPlayerConfig, onReady } = {},
) {
  // ---- Player state ----

  const player = ref(null);

  // ---- Caption state and behavior ----

  // Caption/text-track logic lives in useCaptions; useMediaPlayer drives its
  // player-facing lifecycle hooks (setTrackList/updateTrackList/initCaptionState)
  // from the video.js track events below.
  const captions = useCaptions(player);
  const {
    language,
    subtitles,
    transcript,
    cues,
    activeCueIds,
    captionTracks,
    setLanguage,
    toggleSubtitles,
    toggleTranscript,
    isDefaultTrack,
  } = captions;

  // ---- Playback state - reactive refs driven by video.js events ----

  const currentTime = ref(0);
  const duration = ref(0);
  const isPlaying = ref(false);
  const volume = ref(1.0);
  const muted = ref(false);
  const playbackRate = ref(1.0);
  const isBuffering = ref(false);

  // ---- Loading state ----

  const loading = ref(true);

  // Player settings (volume, mute, rate — persisted to localStorage)
  const playerSettings = new Settings({
    playerVolume: 1.0,
    playerMuted: false,
    playerRate: 1.0,
  });

  // ---- Content viewer integration ----

  // useContentViewer provides file resolution, progress reporting helpers,
  // and content state management. The defaultDuration is derived from the
  // player instance so it updates as media loads.
  const contentViewer = useContentViewer(context, {
    defaultDuration: computed(() => player.value?.duration()),
    customExtractors,
  });

  const {
    defaultFile,
    files,
    supplementaryFiles,
    thumbnailFiles,
    extraFields,
    forceDurationBasedProgress,
    durationBasedProgress,
    reportLoadingError,
    embedded,
  } = contentViewer;

  // ---- Computed values ----

  const savedLocation = computed(() => extraFields.value?.contentState?.savedLocation ?? 0);

  const trackSources = computed(() => {
    return supplementaryFiles.value.filter(file => file.extension === 'vtt');
  });

  // Scroll container rect - computed from the root element's scroll ancestor
  const { containerRect } = rootEl
    ? useScrollContainer(rootEl)
    : { containerRect: ref({ top: 0, bottom: 0, left: 0, width: 0 }) };

  // ---- Playback state binding ----

  // Bind video.js events: keep reactive state refs in sync, drive progress
  // tracking, and persist setting changes.
  function bindPlaybackEvents(vjsPlayer) {
    vjsPlayer.on('timeupdate', () => {
      currentTime.value = vjsPlayer.currentTime();
      updateTime();
    });
    vjsPlayer.on('durationchange', () => {
      duration.value = vjsPlayer.duration();
    });
    vjsPlayer.on('play', () => {
      isPlaying.value = true;
      setPlayState(true);
    });
    vjsPlayer.on('pause', () => {
      isPlaying.value = false;
      setPlayState(false);
      updateContentState();
    });
    vjsPlayer.on('ended', () => {
      isPlaying.value = false;
      setPlayState(false);
      context.emit('finished');
    });
    vjsPlayer.on('volumechange', () => {
      volume.value = vjsPlayer.volume();
      muted.value = vjsPlayer.muted();
      throttledUpdateVolume();
    });
    vjsPlayer.on('ratechange', () => {
      playbackRate.value = vjsPlayer.playbackRate();
      updateRateSetting();
    });
    vjsPlayer.on('waiting', () => {
      isBuffering.value = true;
    });
    vjsPlayer.on('playing', () => {
      isBuffering.value = false;
    });
    vjsPlayer.on('seeking', handleSeek);
    vjsPlayer.on('error', reportLoadingError);
  }

  // ---- Playback actions ----

  function togglePlay() {
    if (!player.value) return;
    if (player.value.paused()) {
      player.value.play();
    } else {
      player.value.pause();
    }
  }

  function seek(time) {
    if (!player.value) return;
    player.value.currentTime(time);
  }

  function rewind(seconds = 10) {
    if (!player.value) return;
    player.value.currentTime(Math.max(0, player.value.currentTime() - seconds));
  }

  function forward(seconds = 10) {
    if (!player.value) return;
    player.value.currentTime(
      Math.min(player.value.duration(), player.value.currentTime() + seconds),
    );
  }

  function setVolume(val) {
    if (!player.value) return;
    player.value.volume(val);
  }

  function toggleMute() {
    if (!player.value) return;
    player.value.muted(!player.value.muted());
  }

  function setPlaybackRate(rate) {
    if (!player.value) return;
    player.value.playbackRate(rate);
  }

  // ---- Progress tracking ----

  const { updateContentState, updateTime, handleSeek, setPlayState } = useMediaProgress({
    player,
    emit: context.emit,
    forceDurationBasedProgress,
    durationBasedProgress,
    extraFields,
    savedLocation,
  });

  // Periodic content-state persistence. useIntervalFn manages a single timer:
  // resume() restarts it (clearing any prior timer, so re-init can't stack
  // intervals) and it is auto-disposed when the component's scope unmounts.
  const { pause: pauseContentStateSync, resume: resumeContentStateSync } = useIntervalFn(
    updateContentState,
    30000,
    { immediate: false },
  );

  // ---- Settings persistence ----

  function updateVolumeSetting() {
    if (!player.value) return;
    playerSettings.playerVolume = player.value.volume();
    playerSettings.playerMuted = player.value.muted();
  }

  const throttledUpdateVolume = useThrottleFn(updateVolumeSetting, 1000);

  function updateRateSetting() {
    if (!player.value) return;
    playerSettings.playerRate = player.value.playbackRate();
  }

  function useSavedSettings() {
    player.value.volume(playerSettings.playerVolume);
    player.value.muted(playerSettings.playerMuted);
    player.value.playbackRate(playerSettings.playerRate);
  }

  // ---- Autoplay / first-interaction ----

  function playOnFirstInteraction() {
    wrapperRef.value.addEventListener(
      'click',
      () => {
        player.value.play();
      },
      { once: true },
    );
  }

  // ---- Player lifecycle ----

  /**
   * Called by videojs when the player is ready. Seeks to the saved location,
   * attempts autoplay (or sets up first-interaction fallback), applies
   * persisted settings, and invokes the optional onReady callback for
   * component-specific setup.
   */
  function handleReadyPlayer() {
    const startTime = savedLocation.value >= player.value.duration() ? 0 : savedLocation.value;
    player.value.currentTime(startTime);

    if (embedded.value) {
      // When embedded, don't attempt autoplay — play on first interaction
      playOnFirstInteraction();
    } else {
      // Attempt autoplay; if browser blocks it, fall back to play on first interaction
      const playPromise = player.value.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playOnFirstInteraction();
        });
      }
    }

    useSavedSettings();
    loading.value = false;
    playerRef.value.tabIndex = -1;
    resumeContentStateSync();

    if (onReady) {
      onReady();
    }
  }

  // Create and initialize a videojs player instance. options.getPlayerConfig
  // is a function (not a value) because the config references component-specific
  // state that must be read at creation time.
  function initPlayer() {
    if (!defaultFile.value?.storage_url) {
      return;
    }
    nextTick(() => {
      // Dispose any existing player first so the re-init path starts from clean
      // state. The element itself is not reused: consumers key the media
      // element's parent on the source, so this runs against the old, already
      // detached tag.
      resetState();
      const vjsPlayer = videojs(playerRef.value, getPlayerConfig(), handleReadyPlayer);
      setPlayer(vjsPlayer);
    });
  }

  // Public action: Initialize player
  function setPlayer(vjsPlayer) {
    if (!vjsPlayer) {
      return;
    }

    vjsPlayer.one('loadstart', () => {
      captions.setTrackList(vjsPlayer.textTracks());

      const onTrackChange = () => {
        captions.updateTrackList(vjsPlayer.textTracks());
      };
      vjsPlayer.on('texttrackchange', onTrackChange);
      vjsPlayer.on('dispose', () => vjsPlayer.off('texttrackchange', onTrackChange));
    });

    vjsPlayer.one('loadedmetadata', () => {
      captions.initCaptionState();
    });

    bindPlaybackEvents(vjsPlayer);
    // markRaw so Vue never proxies the video.js player: it is a live stateful
    // object, not reactive data, and a reactive/readonly proxy blocks its
    // internal writes. The ref itself stays reactive for null->instance changes.
    player.value = markRaw(vjsPlayer);
  }

  // Public action: Cleanup and reset
  function resetState() {
    pauseContentStateSync();
    if (player.value) {
      player.value.dispose();
      player.value = null;
    }

    captions.resetState();
    currentTime.value = 0;
    duration.value = 0;
    isPlaying.value = false;
    volume.value = 1.0;
    muted.value = false;
    playbackRate.value = 1.0;
    isBuffering.value = false;
  }

  // ---- Player init lifecycle ----

  // Own the init lifecycle here rather than duplicating it in every consuming
  // component: initialize on mount, and re-initialize when the source file
  // changes (same instance, different content).
  onMounted(initPlayer);
  watch(defaultFile, (newVal, oldVal) => {
    if (newVal?.storage_url !== oldVal?.storage_url) {
      initPlayer();
    }
  });

  // ---- Cleanup ----

  onBeforeUnmount(() => {
    updateContentState();
    context.emit('stopTracking');
    resetState();
  });

  // ---- Shared state/action groups ----

  // Defined once and shared between the provided context (descendants get
  // readonly refs) and the returned API (the parent gets the raw refs), so a
  // new field is added in one place, not two.
  const playbackState = {
    currentTime,
    duration,
    isPlaying,
    volume,
    muted,
    playbackRate,
    isBuffering,
  };
  const playbackActions = {
    togglePlay,
    seek,
    rewind,
    forward,
    setVolume,
    toggleMute,
    setPlaybackRate,
  };

  // ---- Provide context to descendant components ----

  const injectedContext = {
    // Player instance. Provided as the raw ref (not readonly): consumers call
    // mutating video.js methods on it (seek, fullscreen toggle), which a
    // readonly proxy would block. The instance is markRaw'd in setPlayer.
    player,

    // Caption state (readonly refs for reactivity)
    language: readonly(language),
    subtitles: readonly(subtitles),
    transcript: readonly(transcript),
    cues: readonly(cues),
    activeCueIds: readonly(activeCueIds),

    // Caption actions
    setLanguage,
    toggleSubtitles,
    toggleTranscript,

    // Playback state (readonly) and actions
    ...mapValues(playbackState, readonly),
    ...playbackActions,

    // Scroll container positioning
    containerRect: readonly(containerRect),
  };

  provide(MEDIA_PLAYER_CONTEXT_KEY, injectedContext);

  // ---- Return API for parent component ----

  return {
    // Player instance
    player,

    // Content viewer values (from useContentViewer)
    defaultFile,
    files,
    supplementaryFiles,
    thumbnailFiles,
    extraFields,
    embedded,

    // Caption state
    captionTracks,
    transcript: readonly(transcript),
    toggleTranscript,

    // Track utilities
    trackSources,
    isDefaultTrack,

    // Progress/loading state
    loading,

    // Playback state and actions
    ...playbackState,
    ...playbackActions,
  };
}

/**
 * Inject media player context in descendant components
 *
 * This is the explicit API for child components to access the media player state.
 * Call this in the setup() function of any component that needs access to the
 * media player (e.g., TranscriptMenuItem, SubtitlesMenuItem, MediaPlayerTranscript).
 * @returns {object} The media player context provided by useMediaPlayer:
 * caption state/actions and playback state/actions. All state refs are readonly;
 * `player` is the raw ref so consumers can call mutating video.js methods on it.
 * @throws {Error} If called outside of a media player context
 * @example
 * // In a child component
 * setup() {
 *   const { subtitles, toggleSubtitles } = injectMediaPlayer();
 *   return { subtitles, toggleSubtitles };
 * }
 */
export function injectMediaPlayer() {
  const context = inject(MEDIA_PLAYER_CONTEXT_KEY);

  if (!context) {
    throw new Error(
      'injectMediaPlayer() must be called within a component that is a descendant of a component using useMediaPlayer()',
    );
  }

  return context;
}
