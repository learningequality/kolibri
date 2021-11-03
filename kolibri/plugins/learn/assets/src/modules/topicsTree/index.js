import Vue from 'kolibri.lib.vue';

function defaultState() {
  return {
    channel: {},
    content: {},
    // used in TOPICS_TOPIC, TOPICS_TOPIC_SEARCH
    contents: [],
    isRoot: null,
    topic: {},
    // used in RECOMMENDED_CONTENT
    recommended: [],
  };
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
    },
    ADD_MORE_CONTENTS(state, payload) {
      state.contents = state.contents.concat(payload.results);
      state.topic.children.more = payload.more;
    },
    ADD_MORE_CHILD_CONTENTS(state, payload) {
      const child = state.contents[payload.index];
      child.children.results = child.children.results.concat(payload.results);
      child.children.more = payload.more;
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
  },
};
