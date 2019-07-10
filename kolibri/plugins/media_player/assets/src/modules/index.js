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
      if (store.state.player) {
        store.state.player.dispose();
        store.commit('SET_PLAYER', null);
      }

      player.one('loadstart', () => {
        store.dispatch('captions/setTrackList', player.textTracks());

        player.on('texttrackchange', () => {
          store.dispatch('captions/updateTrackList', player.textTracks());
        });
      });

      store.commit('SET_PLAYER', player);
    },

    withPlayer(store, callback) {
      return callback(store.state.player);
    },
  },
  modules: {
    captions,
  },
};
