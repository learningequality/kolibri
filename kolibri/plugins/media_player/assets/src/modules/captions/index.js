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
  captionSubtitles: false,
  captionTranscript: false,
});

/**
 * @param state
 * @return {TextTrack[]}
 */
const tracks = state => {
  return trackUtils.listToArray(state.trackList || []);
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
      cueList: null,
      activeCueList: null,

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
    SET_CUE_LIST(state, cueList) {
      state.cueList = cueList;
    },
    SET_ACTIVE_CUE_LIST(state, cueList) {
      state.activeCueList = cueList;
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
      const track = tracks(state).find(track => state.language === track.language);
      return track ? track.label : '';
    },
    /**
     * @param state
     * @return {TextTrackCue[]}
     */
    cues(state) {
      return trackUtils.listToArray(state.cueList || []);
    },
    /**
     * @param state
     * @return {String[]}
     */
    activeCueIds(state) {
      return trackUtils
        .listToArray(state.activeCueList || [])
        .map(cue => cue.id)
        .filter(Boolean);
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
  },
  actions: {
    setLanguage(store, language) {
      if (store.state.language === language) {
        return;
      }

      store.commit('SET_LANGUAGE', language);

      const settings = new Settings(defaultSettings());
      settings.captionLanguage = language;
      store.dispatch('synchronizeTrackList');

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
          store.dispatch('setCuesFromTrack', track);
          store.dispatch('setActiveCuesFromTrack', track);
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
      store.commit('SET_CUE_LIST', track.cues);
      // Ensure cues have ids
      store.getters.cues.forEach((cue, i) => {
        cue.id = track.id + '-cue-' + i;
      });
    },
    setActiveCuesFromTrack(store, track) {
      store.commit('SET_ACTIVE_CUE_LIST', track.activeCues);
    },
    synchronizeTrackList(store) {
      const { language, subtitles, transcript } = store.state;
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
    toggleSubtitles(store) {
      store.commit('SET_SUBTITLES', !store.state.subtitles);
      store.dispatch('synchronizeTrackList');
    },
    toggleTranscript(store) {
      store.commit('SET_TRANSCRIPT', !store.state.transcript);
      store.dispatch('synchronizeTrackList');
    },
    resetState(store) {
      store.commit('SET_CUE_LIST', null);
      store.commit('SET_ACTIVE_CUE_LIST', null);
    },
  },
};
