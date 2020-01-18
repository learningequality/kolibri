import vue from 'kolibri.lib.vue';
import videojs from 'video.js';
import trackUtils from '../../utils/track';
import Settings from '../../utils/settings';

const { handleSelectedLanguageChange } = videojs.getComponent('TextTrackMenuItem').prototype;

/**
 * @return {{captionLanguage: *, captionSubtitles: boolean, captionTranscript: boolean}}
 */
const defaultSettings = () => ({
  captionLanguage: vue.locale,
  captionSubtitles: true,
  captionTranscript: false,
});

/**
 * @param state
 * @return {TextTrack[]}
 */
const tracks = state => {
  return trackUtils.listToArray(state.trackList || []);
};

/**
 * @param state
 * @return {TextTrack|null}
 */
const languageTrack = state => {
  return tracks(state).find(track => state.language === track.language);
};

export default {
  namespaced: true,
  state: () => {
    const settings = new Settings(defaultSettings());

    return {
      language: settings.captionLanguage,
      subtitles: settings.captionSubtitles,
      transcript: settings.captionTranscript,

      trackList: null,
      cues: [],
      activeCueIds: [],

      trackListeners: [],
    };
  },
  mutations: {
    SET_LANGUAGE(state, language) {
      state.language = language;
    },
    SET_SUBTITLES(state, subtitles) {
      state.subtitles = subtitles;
    },
    SET_TRANSCRIPT(state, transcript) {
      state.transcript = transcript;
    },
    SET_TRACK_LIST(state, trackList) {
      state.trackList = trackList;
    },
    SET_CUES(state, cues) {
      state.cues = cues;
    },
    DELETE_CUES(state) {
      state.cues = [];
    },
    SET_ACTIVE_CUE_IDS(state, cueIds) {
      state.activeCueIds = cueIds;
    },
    DELETE_ACTIVE_CUE_IDS(state) {
      state.activeCueIds = [];
    },
    ADD_TRACK_LISTENERS(state, trackId, event, listeners) {
      state.trackListeners.push({ trackId, event, listeners });
    },
    RESET_TRACK_LISTENERS(state) {
      state.trackListeners = [];
    },
  },
  getters: {
    /**
     * @param state
     * @return {string}
     */
    languageLabel(state) {
      const track = languageTrack(state);
      return track ? track.label : '';
    },
    /**
     * @param state
     * @return {TextTrack[]}
     */
    tracks,
    /**
     * @param state
     * @return {TextTrack}
     */
    activeTrack(state) {
      return tracks(state).find(track => trackUtils.isEnabled(track));
    },
    /**
     * @param state
     * @return {TextTrack|null}
     */
    languageTrack,
  },
  actions: {
    initState(store) {
      // If no track for saved language, disable subtitles and transcript
      if (!store.getters.languageTrack) {
        if (store.state.subtitles) {
          store.commit('SET_SUBTITLES', false);
        }
        if (store.state.transcript) {
          store.commit('SET_TRANSCRIPT', false);
        }
      }
    },
    setLanguage(store, language) {
      if (store.state.language === language) {
        return;
      }

      store.commit('SET_LANGUAGE', language);

      const settings = new Settings(defaultSettings());
      settings.captionLanguage = language;
      store.dispatch('synchronizeTrackList');

      // When changing language, and there is no format enabled, enable subtitles
      if (!store.state.subtitles && !store.state.transcript) {
        store.dispatch('toggleSubtitles');
      }

      const track = store.getters.activeTrack;
      if (!track) {
        return;
      }

      // Retain video.js behavior on language change,
      // see TextTrackMenuItem.handleSelectedLanguageChange
      store.dispatch(
        'mediaPlayer/withPlayer',
        player_ => {
          handleSelectedLanguageChange.call({
            track,
            player_,
          });
        },
        { root: true }
      );
    },
    setTrackList(store, trackList) {
      let { language } = store.state;

      if (store.state.trackList) {
        store.state.trackListeners.forEach(({ trackId, event, listener }) => {
          const track = store.getters.tracks.find(track => track.id === trackId);

          if (track) {
            track.removeEventListener(event, listener);
          }
        });

        store.commit('RESET_TRACK_LISTENERS');
      }

      store.commit('SET_TRACK_LIST', trackList);
      store.dispatch('synchronizeTrackList');

      store.getters.tracks.forEach(track => {
        const changeListener = () => {
          if (trackUtils.isEnabled(track)) {
            store.dispatch('setActiveCuesFromTrack', track);
          }
        };
        track.addEventListener('cuechange', changeListener);
        store.commit('ADD_TRACK_LISTENERS', track.id, 'cuechange', changeListener);

        if (track.addCue.overridden) {
          return;
        }

        // Override `addCue` method to hook into the addition of cues
        const addCue = track.addCue.bind(track);
        track.addCue = (...args) => {
          const result = addCue(...args);

          if (track.language == language) {
            store.dispatch('setCuesFromTrack', track);
            store.dispatch('setActiveCuesFromTrack', track);
          }

          return result;
        };
        track.addCue.overridden = true;
      });
    },
    updateTrackList(store, trackList) {
      if (store.state.trackList.length !== trackList.length) {
        return store.dispatch('setTrackList', trackList);
      }

      store.commit('SET_TRACK_LIST', trackList);
      store.dispatch('synchronizeTrackList');
    },
    setCuesFromTrack(store, track) {
      store.commit('DELETE_CUES');

      const cues = trackUtils.listToArray(track.cues || []);
      // Ensure cues have ids
      cues.forEach((cue, i) => {
        cue.id = track.id + '-cue-' + i;
      });

      store.commit('SET_CUES', cues);
    },
    setActiveCuesFromTrack(store, track) {
      // In case we get triggered to set active cues but haven't added cues yet, do that now
      // This helps an issue in Safari where we don't get an updated cue list
      if (track.cues && track.cues.length !== store.state.cues.length) {
        store.dispatch('setCuesFromTrack', track);
      }

      store.commit('DELETE_ACTIVE_CUE_IDS');
      store.commit(
        'SET_ACTIVE_CUE_IDS',
        trackUtils
          .listToArray(track.activeCues || [])
          .map(cue => cue.id)
          .filter(Boolean)
      );
    },
    synchronizeTrackList(store) {
      const { subtitles, transcript } = store.state;
      let { language } = store.state;
      const settings = new Settings(defaultSettings());
      settings.captionSubtitles = subtitles;
      settings.captionTranscript = transcript;

      store.getters.tracks.forEach(track => {
        if (track.language === language) {
          trackUtils.setMode(track, subtitles || transcript, !subtitles);
        } else {
          trackUtils.setMode(track, false);
        }

        if (trackUtils.isEnabled(track)) {
          store.dispatch('setCuesFromTrack', track);
          store.dispatch('setActiveCuesFromTrack', track);
          store.dispatch('setLanguage', track.language);
        }
      });
    },
    checkLanguageTrack(store) {
      const { subtitles, transcript } = store.state;
      let language;

      // When we enable either subtitles or transcript, ensure we have appropriate language track
      if ((subtitles || transcript) && !store.getters.languageTrack) {
        if (store.getters.activeTrack) {
          language = store.getters.activeTrack.language;
        } else {
          // Just use language of first track as fallback
          language = store.getters.tracks[0].language;
        }
      }

      if (language && language !== store.state.language) {
        store.commit('SET_LANGUAGE', language);
      }
    },
    toggleSubtitles(store) {
      store.commit('SET_SUBTITLES', !store.state.subtitles);
      store.dispatch('checkLanguageTrack');
      store.dispatch('synchronizeTrackList');
    },
    toggleTranscript(store) {
      store.commit('SET_TRANSCRIPT', !store.state.transcript);
      store.dispatch('checkLanguageTrack');
      store.dispatch('synchronizeTrackList');
    },
    resetState(store) {
      store.commit('DELETE_CUES');
      store.commit('DELETE_ACTIVE_CUE_IDS');
    },
  },
};
