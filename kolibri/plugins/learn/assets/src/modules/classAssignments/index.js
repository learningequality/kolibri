import isEqual from 'lodash/isEqual';
import { LearnerClassroomResource } from '../../apiResources';

export default {
  namespaced: true,
  state: {
    currentClassroom: {},
  },
  mutations: {
    SET_CURRENT_CLASSROOM(state, classroom) {
      state.currentClassroom = { ...classroom };
    },
    RESET_STATE(state) {
      state.currentClassroom = {};
    },
  },
  actions: {
    updateWithChanges(store) {
      return LearnerClassroomResource.fetchModel({
        id: store.state.currentClassroom.id,
        force: true,
      }).then(learnerClassroom => {
        if (!isEqual(store.state.currentClassroom, learnerClassroom)) {
          store.commit('SET_CURRENT_CLASSROOM', learnerClassroom);
        }
      });
    },
  },
};
