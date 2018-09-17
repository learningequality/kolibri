import Vue from 'kolibri.lib.vue';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function SET_LESSON_CONTENTNODES(state, contentNodes) {
  state.pageState.contentNodes = [...contentNodes];
}

export function SET_LESSON_CONTENTNODES_PROGRESS(state, progressArray) {
  progressArray.forEach(progress => {
    const contentNode = state.pageState.contentNodes.find(node => node.pk === progress.pk);
    if (contentNode) {
      Vue.set(contentNode, 'progress_fraction', progress.progress_fraction);
    }
  });
}

export function SET_CURRENT_LESSON(state, lesson) {
  state.pageState.currentLesson = { ...lesson };
}

export function SET_LEARNER_CLASSROOMS(state, classrooms) {
  state.pageState.classrooms = [...classrooms];
}

export function SET_CURRENT_CLASSROOM(state, classroom) {
  state.pageState.currentClassroom = { ...classroom };
}

export function SET_CURRENT_AND_NEXT_LESSON_RESOURCES(state, resources) {
  const firstResource = { ...resources[0] };
  // HACK: duck-typing the pageState to work with content-page as-is
  state.pageState.content = {
    ...firstResource,
    id: firstResource.pk,
    ...assessmentMetaDataState(firstResource),
  };
  // Needed for the content renderer to work
  if (resources[1]) {
    state.pageState.content.next_content = { ...resources[1] };
  } else {
    state.pageState.content.next_content = null;
  }
}
