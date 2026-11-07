import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { handleApiError } from 'kolibri/utils/appError';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../store';

let pendingLoad = null;

export function exerciseRootRedirectHandler(params, name, next, query) {
  return showExerciseDetailView({ params }).then(() => {
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

export function generateExerciseDetailHandler(paramsToCheck) {
  return function exerciseDetailHandler(to, from) {
    const { params } = to;
    const fromParams = from.params;
    const sameReport =
      to.name === from.name && paramsToCheck.every(param => params[param] === fromParams[param]);
    if (sameReport) {
      if (pendingLoad) {
        pendingLoad.params = params;
      } else {
        store.commit('exerciseDetail/SET_STATE', reportPosition(params));
        pageLoading.value = false;
      }
      return;
    }
    pageLoading.value = true;
    const load = { params };
    pendingLoad = load;
    const isLatest = () => load === pendingLoad;
    initClassInfo(params.classId)
      .then(() => showExerciseDetailView(load, isLatest))
      .catch(error => {
        if (isLatest()) {
          handleApiError({ error, shouldThrow: false });
        }
      })
      .finally(() => {
        if (isLatest()) {
          pageLoading.value = false;
          pendingLoad = null;
        }
      });
  };
}

function initClassInfo(classId) {
  const { isSuperuser } = useUser();
  const { fetchFacilities, facilities } = useFacilities();
  const fetchFacilitiesPromise =
    get(isSuperuser) && get(facilities).length === 0
      ? fetchFacilities().catch(() => {})
      : Promise.resolve();
  return Promise.all([store.dispatch('initClassInfo', classId), fetchFacilitiesPromise]);
}

function reportPosition({ questionId = 0, tryIndex = 0, interactionIndex = 0 }) {
  return {
    questionId: Number(questionId),
    tryIndex: Number(tryIndex),
    interactionIndex: Number(interactionIndex),
  };
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function showExerciseDetailView(load, isLatest = () => true) {
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  const nodeId = store.state.classSummary.contentMap[load.params.exerciseId].node_id;
  return ContentNodeResource.retrieve(nodeId).then(
    exercise => {
      if (!isLatest()) {
        return;
      }
      store.commit('exerciseDetail/SET_STATE', {
        ...reportPosition(load.params),
        exercise,
        learnerId: load.params.learnerId,
      });
    },
    error => {
      if (!isLatest()) {
        return;
      }
      pageLoading.value = false;
      store.dispatch('handleCoachPageError', error);
    },
  );
}
