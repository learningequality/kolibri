import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../store';
import { PageNames } from '../../constants';

export function exerciseRootRedirectHandler(params, name, next, query) {
  return showExerciseDetailView(params).then(() => {
    next({
      name: name,
      params: {
        ...params,
        questionId: 0,
        tryIndex: 0,
        interactionIndex: 0,
      },
      query,
    });
  });
}

const EXERCISE_REPORTS = [
  PageNames.LESSON_EXERCISE_LEARNER_REPORT,
  PageNames.LESSON_LEARNER_EXERCISE_REPORT,
];

export function isSameExerciseReport(to, from) {
  return (
    EXERCISE_REPORTS.includes(to.name) &&
    to.name === from.name &&
    ['learnerId', 'lessonId', 'exerciseId'].every(param => to.params[param] === from.params[param])
  );
}

export function exerciseDetailHandler(to, from) {
  if (isSameExerciseReport(to, from)) {
    store.commit('exerciseDetail/SET_STATE', reportPosition(to.params));
    pageLoading.value = false;
    return;
  }
  pageLoading.value = true;
  showExerciseDetailView(to.params).then(() => {
    // Set not loading regardless, as we are now
    // ready to render.
    pageLoading.value = false;
  });
}

function reportPosition({ questionId = 0, tryIndex = 0, interactionIndex = 0 }) {
  return {
    questionId: Number(questionId),
    tryIndex: Number(tryIndex),
    interactionIndex: Number(interactionIndex),
  };
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function showExerciseDetailView(params) {
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  const nodeId = store.state.classSummary.contentMap[params.exerciseId].node_id;
  return ContentNodeResource.retrieve(nodeId).then(
    exercise => {
      store.commit('exerciseDetail/SET_STATE', {
        ...reportPosition(params),
        exercise,
        learnerId: params.learnerId,
      });
    },
    error => {
      pageLoading.value = false;
      store.dispatch('handleCoachPageError', error);
    },
  );
}
