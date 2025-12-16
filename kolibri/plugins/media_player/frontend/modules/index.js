import captions from './captions';

export default {
  namespaced: true,
  state: {
    player: null,
  },
  mutations: {
    SET_PLAYER(state, player) {
      state.player = player;
    },
  },
  getters: {},
  actions: {
    setPlayer(store, player) {
      store.dispatch('resetState');

      player.one('loadstart', () => {
        store.dispatch('captions/setTrackList', player.textTracks());

        const onTrackChange = () => {
          store.dispatch('captions/updateTrackList', player.textTracks());
        };
        player.on('texttrackchange', onTrackChange);
        player.on('dispose', () => player.off('texttrackchange', onTrackChange));
      });

      player.one('loadedmetadata', () => {
        store.dispatch('captions/initState');
      });

      store.commit('SET_PLAYER', player);
    },
    withPlayer(store, callback) {
      return callback(store.state.player);
    },
    resetState(store) {
      if (store.state.player) {
        store.state.player.dispose();
        store.commit('SET_PLAYER', null);
      }

      store.dispatch('captions/resetState');
    },
  },
  modules: {
    captions,
  },
};
