import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { createTranslator } from 'kolibri.utils.i18n';
import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import { PageNames } from '../../constants';
import { _createExam } from '../shared/exams';

const snackbarTranslator = createTranslator('ExamCreateSnackbarTexts', {
  newExamCreated: 'New exam created',
});

export function resetExamCreationState(store) {
  store.commit('RESET_STATE');
}

export function setTitle(store, title) {
  store.commit('SET_TITLE', title);
}

export function setNumberOfQuestions(store, title) {
  store.commit('SET_NUMBER_OF_QUESTIONS', title);
}

export function setSeed(store, seed) {
  store.commit('SET_SEED', seed);
}

export function addToSelectedExercises(store, exercises) {
  store.commit('ADD_TO_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function removeFromSelectedExercises(store, exercises) {
  store.commit('REMOVE_FROM_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function setSelectedExercises(store, exercises) {
  store.commit('SET_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function updateAvailableQuestions(store) {
  const { selectedExercises } = store.state;
  if (selectedExercises.length > 0) {
    return ContentNodeResource.fetchNodeAssessments(selectedExercises.map(ex => ex.id)).then(
      resp => {
        store.commit('SET_AVAILABLE_QUESTIONS', resp.entity);
      }
    );
  }
  store.commit('SET_AVAILABLE_QUESTIONS', 0);
  return Promise.resolve();
}

export function fetchAdditionalSearchResults(store, params) {
  return ContentNodeSearchResource.fetchCollection({
    getParams: pickBy({
      search: params.searchTerm,
      kind: params.kind,
      channel_id: params.channelId,
      exclude_content_ids: uniq(params.currentResults.map(({ content_id }) => content_id)),
    }),
  }).then(results => {
    store.commit('SET_ADDITIONAL_SEARCH_RESULTS', results);
  });
}

export function createExamAndRoute(store, exam) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  _createExam(store, exam).then(
    () => {
      router.getInstance().push({ name: PageNames.EXAMS });
      store.dispatch(
        'createSnackbar',
        {
          text: snackbarTranslator.$tr('newExamCreated'),
          autoDismiss: true,
        },
        { root: true }
      );
    },
    error => store.dispatch('handleApiError', error, { root: true })
  );
}
