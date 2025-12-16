import lessonResources from '../lessonResources';
import * as actions from './actions';

function defaultState() {
  return {
    currentLesson: {},
    learnerGroups: [],
    resourceCache: {},
    workingResources: [],
  };
}

export default {
  namespaced: true,
  state: defaultState,
  getters: {
    getChannelForNode(state, getters, rootState) {
      return function getter(node) {
        return rootState.channels.list.find(({ id }) => id === node.channel_id);
      };
    },
    workingResources(state) {
      return state.workingResources || [];
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_CURRENT_LESSON(state, currentLesson) {
      state.currentLesson = currentLesson;
    },
    SET_LEARNER_GROUPS(state, learnerGroups) {
      state.learnerGroups = [...learnerGroups];
    },
    SET_WORKING_RESOURCES(state, workingResources) {
      state.workingResources = [...workingResources];
    },
    ADD_TO_WORKING_RESOURCES(state, resources) {
      state.workingResources = [
        ...state.workingResources,
        ...resources.map(r => ({
          contentnode_id: r.id,
          content_id: r.content_id,
          channel_id: r.channel_id,
        })),
      ];
    },
    REMOVE_FROM_WORKING_RESOURCES(state, resources) {
      state.workingResources = state.workingResources.filter(
        // Resources could either be a content node or a resource item from a lesson
        workingResource =>
          !resources.find(r => (r.id || r.contentnode_id) === workingResource.contentnode_id),
      );
    },
    ADD_TO_RESOURCE_CACHE(state, { node, channelTitle }) {
      if (node && node.id) {
        state.resourceCache[node.id] = {
          ...node,
          channelTitle,
        };
      }
    },
  },
  actions,
  modules: {
    resources: lessonResources,
  },
};
