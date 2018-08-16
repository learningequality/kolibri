import Vue from 'kolibri.lib.vue';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export default {
  namespaced: true,
  state: {
    contentNodes: [],
    currentLesson: {},
  },
  mutations: {
    SET_LESSON_CONTENTNODES(state, contentNodes) {
      state.contentNodes = [...contentNodes];
    },
    SET_CURRENT_LESSON(state, lesson) {
      state.currentLesson = { ...lesson };
    },
    SET_LESSON_CONTENTNODES_PROGRESS(state, progressArray) {
      progressArray.forEach(progress => {
        const contentNode = state.contentNodes.find(node => node.id === progress.id);
        if (contentNode) {
          Vue.set(contentNode, 'progress_fraction', progress.progress_fraction);
        }
      });
    },
  },
  modules: {
    //  LESSON_RESOURCE_VIEWER
    resource: {
      namespaced: true,
      state: {
        content: {},
        // TODO share current lesson with parent
        currentLesson: {},
      },
      mutations: {
        SET_CURRENT_LESSON(state, lesson) {
          state.currentLesson = { ...lesson };
        },
        SET_CURRENT_AND_NEXT_LESSON_RESOURCES(state, resources) {
          const firstResource = { ...resources[0] };
          // HACK: duck-typing the state to work with content-page as-is
          state.content = {
            ...firstResource,
            id: firstResource.id,
            ...assessmentMetaDataState(firstResource),
          };
          // Needed for the lesson resource viewer to work
          if (resources[1]) {
            state.content.next_content = { ...resources[1] };
          } else {
            state.content.next_content = null;
          }
        },
      },
    },
  },
};
