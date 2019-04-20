import isArray from 'lodash/isArray';
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
  state: defaultState(),
  getters: {
    getChannelForNode(state, getters, rootState) {
      return function getter(node) {
        return rootState.core.channels.list.find(({ id }) => id === node.channel_id);
      };
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
    ADD_TO_WORKING_RESOURCES(state, ids) {
      if (typeof ids === 'string') {
        state.workingResources.push(ids);
      } else if (isArray(ids)) {
        state.workingResources = [...state.workingResources, ...ids];
      }
    },
    REMOVE_FROM_WORKING_RESOURCES(state, ids) {
      if (typeof ids === 'string') {
        state.workingResources = state.workingResources.filter(resourceId => resourceId !== ids);
      } else if (isArray(ids)) {
        state.workingResources = state.workingResources.filter(
          resourceId => !ids.includes(resourceId)
        );
      }
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
