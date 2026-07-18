import vue, { ref, computed } from 'vue';
import videojs from 'video.js';
import { languageIdToCode } from 'kolibri/utils/i18n';
import trackUtils from '../utils/track';
import Settings from '../utils/settings';

const { handleSelectedLanguageChange } = videojs.getComponent('TextTrackMenuItem').prototype;

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
 * Composable for caption / text-track state and behavior: the active language,
 * subtitles vs. transcript, cue tracking, and synchronization with the video.js
 * text-track API. Caption preferences persist to localStorage.
 *
 * The player-driven lifecycle methods (setTrackList, updateTrackList,
 * initCaptionState, resetState) are called by useMediaPlayer as the player
 * emits its track events.
 * @param {import('vue').Ref} player - Ref to the video.js player instance
 * @returns {object} Caption state, actions, and lifecycle hooks:
 *   - language {Ref<string>} - Current caption language
 *   - subtitles {Ref<boolean>} - Whether subtitles are enabled
 *   - transcript {Ref<boolean>} - Whether transcript is enabled
 *   - cues {Ref<Array>} - Caption cues for the current language
 *   - activeCueIds {Ref<Array>} - Currently active cue IDs
 *   - captionTracks {ComputedRef<Array>} - Available caption tracks
 *   - setLanguage {Function} - Set the caption language
 *   - toggleSubtitles {Function} - Toggle subtitles on/off
 *   - toggleTranscript {Function} - Toggle transcript on/off
 *   - isDefaultTrack {Function} - Check if a language is the default track
 *   - setTrackList {Function} - Bind a new text-track list
 *   - updateTrackList {Function} - Reconcile a changed text-track list
 *   - initCaptionState {Function} - Disable captions with no matching track
 *   - resetState {Function} - Clear cue state
 */
export default function useCaptions(player) {
  const language = ref(null);
  const subtitles = ref(true);
  const transcript = ref(false);
  const trackList = ref(null);
  const cues = ref([]);
  const activeCueIds = ref([]);
  // Plain array (not a ref): used only imperatively, never exposed reactively.
  let trackListeners = [];

  // Caption settings (persisted to localStorage)
  const captionSettings = new Settings(defaultSettings());
  language.value = captionSettings.captionLanguage;
  subtitles.value = captionSettings.captionSubtitles;
  transcript.value = captionSettings.captionTranscript;

  const captionTracks = computed(() => tracks());

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
    captionSettings.save({
      captionSubtitles: subtitles.value,
      captionTranscript: transcript.value,
    });

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
      subtitles.value = false;
      transcript.value = false;
    }
  }

  // Detach the cuechange listeners recorded in setTrackList. Idempotent and a
  // no-op when none are registered, so it is safe to call from both a track-list
  // swap and resetState.
  function removeTrackListeners() {
    const ts = tracks();
    trackListeners.forEach(({ trackId, event, listener }) => {
      const track = ts.find(t => t.id === trackId);
      if (track) {
        track.removeEventListener(event, listener);
      }
    });
    trackListeners = [];
  }

  function setTrackList(newTrackList) {
    removeTrackListeners();

    trackList.value = newTrackList;
    synchronizeTrackList();

    tracks().forEach(track => {
      const changeListener = () => {
        if (trackUtils.isEnabled(track)) {
          setActiveCuesFromTrack(track);
        }
      };
      track.addEventListener('cuechange', changeListener);
      trackListeners.push({
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

  // Public action: Set caption language
  function setLanguage(newLanguage) {
    if (language.value === newLanguage) {
      return;
    }

    language.value = newLanguage;

    captionSettings.captionLanguage = newLanguage;
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

  function isDefaultTrack(langCode) {
    if (!language.value) {
      return false;
    }
    const shortLangCode = languageIdToCode(langCode);
    const shortGlobalLangCode = languageIdToCode(language.value);
    return shortLangCode === shortGlobalLangCode;
  }

  function resetState() {
    removeTrackListeners();
    cues.value = [];
    activeCueIds.value = [];
  }

  return {
    // State
    language,
    subtitles,
    transcript,
    cues,
    activeCueIds,
    captionTracks,

    // Actions
    setLanguage,
    toggleSubtitles,
    toggleTranscript,
    isDefaultTrack,

    // Player-driven lifecycle
    setTrackList,
    updateTrackList,
    initCaptionState,
    resetState,
  };
}
