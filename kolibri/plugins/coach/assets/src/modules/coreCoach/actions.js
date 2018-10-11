import { ClassroomResource } from 'kolibri.resources';
import { pageNameToModuleMap, PageNames } from '../../constants';
import { LessonsPageNames } from '../../constants/lessonsConstants';

export function setClassState(store, classId = null) {
  // HACK add this extra pageId parameter to fool cache
  return ClassroomResource.fetchCollection({
    getParams: { role: 'coach', pageId: store.rootState.core.pageSessionId },
  })
    .then(classrooms => {
      store.commit('SET_CLASS_INFO', {
        classId,
        currentClassroom: classId && classrooms.find(({ id }) => id === classId),
        classList: [...classrooms],
      });
    })
    .catch(error => store.dispatch('handleApiError', error));
}

/**
  * Handle coach page errors.
  * The status code errors that's related to the authentication issue, most not show
    in coach page beacuse there's an `auth-message` that explain the error.
**/
export function handleCoachPageError(store, errorObject) {
  const authErrorCodes = [401, 403, 404, 407];
  if (authErrorCodes.includes(errorObject.status.code)) {
    store.dispatch('handleError', '');
  } else {
    store.dispatch('handleError', errorObject);
  }
}

export function resetModuleState(store, { toRoute, fromRoute }) {
  // If going from Lesson Summary to something other than Resource Selection, reset
  if (
    fromRoute.name === LessonsPageNames.SUMMARY &&
    toRoute.name !== LessonsPageNames.SELECTION_ROOT
  ) {
    return store.dispatch('lessonSummary/resetLessonSummaryState');
  }
  if (toRoute.name === PageNames.EXAMS) {
    return store.dispatch('examCreation/resetExamCreationState');
  }
  const moduleName = pageNameToModuleMap[fromRoute.name];
  if (moduleName) {
    store.commit(`${moduleName}/RESET_STATE`);
  }
}
