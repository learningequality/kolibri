import vue, { ref, computed, provide, inject, readonly, onBeforeUnmount, nextTick } from 'vue';
import videojs from 'video.js';
import throttle from 'lodash/throttle';
import useContentViewer from 'kolibri/composables/useContentViewer';
import { languageIdToCode } from 'kolibri/utils/i18n';
import trackUtils from '../utils/track';
import Settings from '../utils/settings';
import customExtractors from '../utils/fileExtractors';
import useScrollContainer from './useScrollContainer';
import useMediaProgress from './useMediaProgress';

const { handleSelectedLanguageChange } = videojs.getComponent('TextTrackMenuItem').prototype;

const MEDIA_PLAYER_CONTEXT_KEY = 'mediaPlayerContext';

/**
 * Available playback rate options for audio/video players
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/**
 * Default caption settings.
 * @returns {{captionLanguage: string, captionSubtitles: boolean, captionTranscript: boolean}}
 */
const defaultSettings = () => ({
  captionLanguage: vue.locale,
  captionSubtitles: true,
  captionTranscript: false,
});

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
 * @param {import('vue').Ref} options.playerRef - The <video>/<audio> element ref for videojs
 * @param {Function} [options.onReady] - Callback after player is ready,
 * for component-specific setup
 * @returns {object} Media player API for the parent component:
 *   - player {Ref<Object>} - The video.js player instance
 *   - initPlayer {Function} - Initialize the player with a config factory
 *   - resetState {Function} - Dispose of player and reset all state
 *   - defaultFile {Ref<Object>} - Primary content file (from useContentViewer)
 *   - files {Ref<Array>} - All content files
 *   - supplementaryFiles {Ref<Array>} - Supplementary files (subtitles, etc.)
 *   - thumbnailFiles {Ref<Array>} - Thumbnail files
 *   - extraFields {Ref<Object>} - Extra fields including contentState
 *   - embedded {Ref<boolean>} - Whether the player is embedded in other content
 *   - captionTracks {ComputedRef<Array>} - Available caption tracks
 *   - captionLanguage {ComputedRef<string>} - Current caption language
 *   - transcript {ComputedRef<boolean>} - Whether transcript is enabled
 *   - toggleTranscript {Function} - Toggle transcript on/off
 *   - trackSources {ComputedRef<Array>} - VTT track source files
 *   - isDefaultTrack {Function} - Check if a language is the default track
 *   - loading {Ref<boolean>} - Whether the player is still loading
 *   - currentTime {Ref<number>} - Current playback position in seconds
 *   - duration {Ref<number>} - Total duration in seconds
 *   - isPlaying {Ref<boolean>} - Whether media is currently playing
 *   - volume {Ref<number>} - Volume level 0-1
 *   - muted {Ref<boolean>} - Whether audio is muted
 *   - playbackRate {Ref<number>} - Playback speed multiplier
 *   - isBuffering {Ref<boolean>} - Whether player is buffering
 *   - togglePlay {Function} - Toggle play/pause
 *   - seek {Function} - Seek to specific time in seconds
 *   - rewind {Function} - Rewind by seconds (default 10)
 *   - forward {Function} - Fast forward by seconds (default 10)
 *   - setVolume {Function} - Set volume 0-1
 *   - toggleMute {Function} - Toggle mute/unmute
 *   - setPlaybackRate {Function} - Set playback speed multiplier
 */
export default function useMediaPlayer(context, options = {}) {
  const { rootEl, wrapperRef, playerRef, onReady } = options;

  // ---- Player state ----

  const player = ref(null);

  // ---- Caption state - all discrete refs ----

  const language = ref(null);
  const subtitles = ref(true);
  const transcript = ref(false);
  const trackList = ref(null);
  const cues = ref([]);
  const activeCueIds = ref([]);
  const trackListeners = ref([]);

  // ---- Playback state - reactive refs driven by video.js events ----

  const currentTime = ref(0);
  const duration = ref(0);
  const isPlaying = ref(false);
  const volume = ref(1.0);
  const muted = ref(false);
  const playbackRate = ref(1.0);
  const isBuffering = ref(false);

  // ---- Loading/interval state ----

  const loading = ref(true);
  let updateContentStateInterval = null;

  // ---- Settings initialization ----

  // Caption settings (persisted to localStorage)
  const captionSettings = new Settings(defaultSettings());
  language.value = captionSettings.captionLanguage;
  subtitles.value = captionSettings.captionSubtitles;
  transcript.value = captionSettings.captionTranscript;

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

  const savedLocation = computed(() => {
    if (extraFields.value && extraFields.value.contentState) {
      return extraFields.value.contentState.savedLocation;
    }
    return 0;
  });

  const captionTracks = computed(() => tracks());
  const captionLanguage = computed(() => language.value);
  const transcriptEnabled = computed(() => transcript.value);

  const trackSources = computed(() => {
    return supplementaryFiles.value.filter(file => file.extension === 'vtt');
  });

  // Scroll container rect - computed from the root element's scroll ancestor
  const { containerRect } = rootEl
    ? useScrollContainer(rootEl)
    : { containerRect: ref({ top: 0, bottom: 0, left: 0, width: 0 }) };

  // ---- Caption internals - not exposed ----

  function tracks() {
    return trackUtils.listToArray(trackList.value || []);
  }

  function activeTrack() {
    return tracks().find(track => trackUtils.isEnabled(track));
  }

  function languageTrack() {
    return tracks().find(track => language.value === track.language);
  }

  function setCuesFromTrack(track) {
    const newCues = trackUtils.listToArray(track.cues || []);
    // Ensure cues have ids
    newCues.forEach((cue, i) => {
      cue.id = track.id + '-cue-' + i;
    });

    cues.value = newCues;
  }

  function setActiveCuesFromTrack(track) {
    // In case we get triggered to set active cues but haven't added cues yet, do that now
    // This helps an issue in Safari where we don't get an updated cue list
    if (track.cues && track.cues.length !== cues.value.length) {
      setCuesFromTrack(track);
    }

    activeCueIds.value = trackUtils
      .listToArray(track.activeCues || [])
      .map(cue => cue.id)
      .filter(Boolean);
  }

  function synchronizeTrackList() {
    const localSettings = new Settings(defaultSettings());
    localSettings.captionSubtitles = subtitles.value;
    localSettings.captionTranscript = transcript.value;

    tracks().forEach(track => {
      if (track.language === language.value) {
        trackUtils.setMode(track, subtitles.value || transcript.value, !subtitles.value);
      } else {
        trackUtils.setMode(track, false);
      }

      if (trackUtils.isEnabled(track)) {
        setCuesFromTrack(track);
        setActiveCuesFromTrack(track);
        setLanguage(track.language);
      }
    });
  }

  function checkLanguageTrack() {
    let newLanguage;

    // When we enable either subtitles or transcript, ensure we have appropriate language track
    if ((subtitles.value || transcript.value) && !languageTrack()) {
      if (activeTrack()) {
        newLanguage = activeTrack().language;
      } else {
        // Just use language of first track as fallback
        const tl = tracks();
        if (tl.length > 0) {
          newLanguage = tl[0].language;
        }
      }
    }

    if (newLanguage && newLanguage !== language.value) {
      language.value = newLanguage;
    }
  }

  function initCaptionState() {
    // If no track for saved language, disable subtitles and transcript
    if (!languageTrack()) {
      if (subtitles.value) {
        subtitles.value = false;
      }
      if (transcript.value) {
        transcript.value = false;
      }
    }
  }

  function setTrackList(newTrackList) {
    if (trackList.value) {
      trackListeners.value.forEach(({ trackId, event, listener }) => {
        const track = tracks().find(t => t.id === trackId);
        if (track) {
          track.removeEventListener(event, listener);
        }
      });
      trackListeners.value = [];
    }

    trackList.value = newTrackList;
    synchronizeTrackList();

    tracks().forEach(track => {
      const changeListener = () => {
        if (trackUtils.isEnabled(track)) {
          setActiveCuesFromTrack(track);
        }
      };
      track.addEventListener('cuechange', changeListener);
      trackListeners.value.push({
        trackId: track.id,
        event: 'cuechange',
        listener: changeListener,
      });

      if (track.addCue.overridden) {
        return;
      }

      // Override `addCue` method to hook into the addition of cues
      const addCue = track.addCue.bind(track);
      track.addCue = (...args) => {
        const result = addCue(...args);

        if (track.language == language.value) {
          setCuesFromTrack(track);
          setActiveCuesFromTrack(track);
        }

        return result;
      };
      track.addCue.overridden = true;
    });
  }

  function updateTrackList(newTrackList) {
    if (trackList.value.length !== newTrackList.length) {
      return setTrackList(newTrackList);
    }

    trackList.value = newTrackList;
    synchronizeTrackList();
  }

  // ---- Caption actions ----

  // Public action: Set caption language
  function setLanguage(newLanguage) {
    if (language.value === newLanguage) {
      return;
    }

    language.value = newLanguage;

    const localSettings = new Settings(defaultSettings());
    localSettings.captionLanguage = newLanguage;
    synchronizeTrackList();

    // When changing language, and there is no format enabled, enable subtitles
    if (!subtitles.value && !transcript.value) {
      toggleSubtitles();
    }

    const track = activeTrack();
    if (!track) {
      return;
    }

    // Retain video.js behavior on language change,
    // see TextTrackMenuItem.handleSelectedLanguageChange
    if (player.value) {
      handleSelectedLanguageChange.call({
        track,
        player_: player.value,
      });
    }
  }

  // Public action: Toggle subtitles
  function toggleSubtitles() {
    subtitles.value = !subtitles.value;
    checkLanguageTrack();
    synchronizeTrackList();
  }

  // Public action: Toggle transcript
  function toggleTranscript() {
    transcript.value = !transcript.value;
    checkLanguageTrack();
    synchronizeTrackList();
  }

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

  // ---- Settings persistence ----

  function updateVolumeSetting() {
    playerSettings.playerVolume = player.value.volume();
    playerSettings.playerMuted = player.value.muted();
  }

  const throttledUpdateVolume = throttle(updateVolumeSetting, 1000);

  function updateRateSetting() {
    playerSettings.playerRate = player.value.playbackRate();
  }

  function useSavedSettings() {
    player.value.volume(playerSettings.playerVolume);
    player.value.muted(playerSettings.playerMuted);
    player.value.playbackRate(playerSettings.playerRate);
  }

  // ---- Track utilities ----

  function isDefaultTrack(langCode) {
    if (!captionLanguage.value) {
      return false;
    }
    const shortLangCode = languageIdToCode(langCode);
    const shortGlobalLangCode = languageIdToCode(captionLanguage.value);
    return shortLangCode === shortGlobalLangCode;
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
    updateContentStateInterval = setInterval(updateContentState, 30000);

    if (onReady) {
      onReady();
    }
  }

  /**
   * Create and initialize a videojs player instance.
   * @param {Function} getPlayerConfig - Returns the videojs configuration object.
   * This is a function (not a value) because the config may reference
   * component-specific state at creation time.
   */
  function initPlayer(getPlayerConfig) {
    if (!defaultFile.value?.storage_url) {
      return;
    }
    nextTick(() => {
      const vjsPlayer = videojs(playerRef.value, getPlayerConfig(), handleReadyPlayer);
      setPlayer(vjsPlayer);
    });
  }

  // Public action: Initialize player
  function setPlayer(vjsPlayer) {
    if (!vjsPlayer) {
      return;
    }
    resetState();

    vjsPlayer.one('loadstart', () => {
      setTrackList(vjsPlayer.textTracks());

      const onTrackChange = () => {
        updateTrackList(vjsPlayer.textTracks());
      };
      vjsPlayer.on('texttrackchange', onTrackChange);
      vjsPlayer.on('dispose', () => vjsPlayer.off('texttrackchange', onTrackChange));
    });

    vjsPlayer.one('loadedmetadata', () => {
      initCaptionState();
    });

    bindPlaybackEvents(vjsPlayer);
    player.value = vjsPlayer;
  }

  function resetCaptionsState() {
    cues.value = [];
    activeCueIds.value = [];
  }

  // Public action: Cleanup and reset
  function resetState() {
    if (player.value) {
      player.value.dispose();
      player.value = null;
    }

    resetCaptionsState();
    currentTime.value = 0;
    duration.value = 0;
    isPlaying.value = false;
    volume.value = 1.0;
    muted.value = false;
    playbackRate.value = 1.0;
    isBuffering.value = false;
  }

  // ---- Cleanup ----

  onBeforeUnmount(() => {
    clearInterval(updateContentStateInterval);
    updateContentState();
    context.emit('stopTracking');
    resetState();
  });

  // ---- Provide context to descendant components ----

  // Context object to provide to descendant components
  const injectedContext = {
    // Player instance (readonly for safety)
    player: readonly(player),

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

    // Playback state (readonly refs)
    currentTime: readonly(currentTime),
    duration: readonly(duration),
    isPlaying: readonly(isPlaying),
    volume: readonly(volume),
    muted: readonly(muted),
    playbackRate: readonly(playbackRate),
    isBuffering: readonly(isBuffering),

    // Playback actions
    togglePlay,
    seek,
    rewind,
    forward,
    setVolume,
    toggleMute,
    setPlaybackRate,

    // Scroll container positioning
    containerRect: readonly(containerRect),
  };

  // Provide context to descendant components
  provide(MEDIA_PLAYER_CONTEXT_KEY, injectedContext);

  // ---- Return API for parent component ----

  return {
    // Player management
    player,
    initPlayer,
    resetState,

    // Content viewer values (from useContentViewer)
    defaultFile,
    files,
    supplementaryFiles,
    thumbnailFiles,
    extraFields,
    embedded,

    // Caption state
    captionTracks,
    captionLanguage,
    transcript: transcriptEnabled,
    toggleTranscript,

    // Track utilities
    trackSources,
    isDefaultTrack,

    // Progress/loading state
    loading,

    // Playback state
    currentTime,
    duration,
    isPlaying,
    volume,
    muted,
    playbackRate,
    isBuffering,

    // Playback actions
    togglePlay,
    seek,
    rewind,
    forward,
    setVolume,
    toggleMute,
    setPlaybackRate,
  };
}

/**
 * Inject media player context in descendant components
 *
 * This is the explicit API for child components to access the media player state.
 * Call this in the setup() function of any component that needs access to the
 * media player (e.g., TranscriptMenuItem, SubtitlesMenuItem, MediaPlayerTranscript).
 * @returns {object} Media player context with the following properties:
 *   - player {Ref<Object>} - Readonly ref to the video.js player instance
 *   - language {Ref<string>} - Current caption language (readonly)
 *   - subtitles {Ref<boolean>} - Whether subtitles are enabled (readonly)
 *   - transcript {Ref<boolean>} - Whether transcript is enabled (readonly)
 *   - cues {Ref<Array>} - Array of caption cues for current language (readonly)
 *   - activeCueIds {Ref<Array>} - Array of currently active cue IDs (readonly)
 *   - currentTime {Ref<number>} - Current playback position in seconds (readonly)
 *   - duration {Ref<number>} - Total duration in seconds (readonly)
 *   - isPlaying {Ref<boolean>} - Whether audio/video is currently playing (readonly)
 *   - volume {Ref<number>} - Volume level 0-1 (readonly)
 *   - muted {Ref<boolean>} - Whether audio is muted (readonly)
 *   - playbackRate {Ref<number>} - Playback speed multiplier (readonly)
 *   - isBuffering {Ref<boolean>} - Whether player is buffering (readonly)
 *   - setLanguage {Function} - Set the caption language
 *   - toggleSubtitles {Function} - Toggle subtitles on/off
 *   - toggleTranscript {Function} - Toggle transcript on/off
 *   - togglePlay {Function} - Toggle play/pause
 *   - seek {Function} - Seek to specific time in seconds
 *   - rewind {Function} - Rewind by seconds (default 10)
 *   - forward {Function} - Fast forward by seconds (default 10)
 *   - setVolume {Function} - Set volume 0-1
 *   - toggleMute {Function} - Toggle mute/unmute
 *   - setPlaybackRate {Function} - Set playback speed multiplier
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
