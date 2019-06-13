import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import { THEME_MODULE_NAMESPACE } from '../../../../../../core/assets/src/state/modules/theme';
import { prefixToColourMap } from '../../constants';

function defaultState() {
  return {
    channel: {},
    content: {},
    // used in TOPICS_TOPIC, TOPICS_CHANNEL
    contents: [],
    isRoot: null,
    topic: {},
    // used in RECOMMENDED_CONTENT
    recommended: [],
    progress: null,
    modalShown: false,
    prerequisites: [],
    link: {},
  };
}

function setTheme(channelTitle) {
  let theme = null;
  for (let prefix in prefixToColourMap) {
    if (channelTitle.toLowerCase().indexOf(prefix) === 0) {
      theme = prefixToColourMap[prefix];
      break;
    }
  }
  if (theme !== null) {
    store.commit(`${THEME_MODULE_NAMESPACE}/SET_CORE_THEME`, {
      '$core-action-light': theme.light,
      '$core-action-dark': theme.dark,
      '$core-accent-color': theme.accent,
    });
  }
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      state.channel = payload.channel || {};
      state.content = payload.content || {};
      state.contents = payload.contents || [];
      state.isRoot = payload.isRoot || null;
      state.topic = payload.topic || {};
      state.recommended = payload.recommended || [];
      state.progress = payload.progress || null;
      setTheme(state.channel.title);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_NODE_PROGRESS(state, progressArray) {
      progressArray.forEach(progress => {
        const contentNode = state.contents.find(node => node.id === progress.id);
        if (contentNode) {
          Vue.set(contentNode, 'progress', progress.progress_fraction);
        }
      });
    },
    SET_PREREQUISITES_MODAL(state, modalShown) {
      state.modalShown = modalShown;
    },

    SET_PREREQUISITES(state, arr = [{}, []]) {
      state.link = arr[0];
      state.prerequisites = arr[1];
    },
  },
};
