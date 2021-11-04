import Vue from 'kolibri.lib.vue';
import { ContentNodeResource } from 'kolibri.resources';
import { _collectionState } from '../coreLearn/utils';
import useContentNodeProgress from '../../composables/useContentNodeProgress';

const { fetchContentNodeTreeProgress } = useContentNodeProgress();

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
      state.contents = state.contents.concat(_collectionState(payload.children.results));
      state.topic.children.more = payload.children.more;
    },
    ADD_MORE_CHILD_CONTENTS(state, payload) {
      const child = state.contents[payload.index];
      child.children.results = child.children.results.concat(payload.children.results);
      child.children.more = payload.children.more;
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
  actions: {
    loadMoreTopics(store) {
      const more = store.state.topic.children.more;
      if (more) {
        fetchContentNodeTreeProgress(more);
        return ContentNodeResource.fetchTree(more)
          .then(data => {
            store.commit('ADD_MORE_CONTENTS', data);
          })
          .catch(err => {
            store.dispatch('handleApiError', err);
          });
      }
    },
    loadMoreContents(store, parentId) {
      const parentIndex = store.state.contents.findIndex(p => p.id === parentId);
      const parent = parentIndex > -1 ? store.state.contents[parentIndex] : null;
      const more = parent && parent.children && parent.children.more;
      if (more) {
        fetchContentNodeTreeProgress(more);
        return ContentNodeResource.fetchTree(more)
          .then(data => {
            data.index = parentIndex;
            store.commit('ADD_MORE_CHILD_CONTENTS', data);
          })
          .catch(err => {
            store.dispatch('handleApiError', err);
          });
      }
    },
  },
};
