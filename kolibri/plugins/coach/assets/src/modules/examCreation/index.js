import unionBy from 'lodash/unionBy';
import * as actions from './actions';

function defaultState() {
  return {
    title: '',
    numberOfQuestions: 10,
    seed: null,
    contentList: [],
    selectedExercises: [],
    availableQuestions: 0,
    searchResults: {
      channel_ids: [],
      content_kinds: [],
      results: [],
      total_results: 0,
      contentIdsFetched: [], // to account for topics without exercises that are filtered out
    },
    ancestors: [],
    examsModalSet: false,
    currentContentNode: {},
    preview: {
      completionData: null,
      questions: null,
    },
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    numRemainingSearchResults(state) {
      return state.searchResults.total_results - state.searchResults.contentIdsFetched.length;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_TITLE(state, title) {
      state.title = title;
    },
    SET_NUMBER_OF_QUESTIONS(state, numberOfQuestions) {
      state.numberOfQuestions = numberOfQuestions;
    },
    SET_SEED(state, seed) {
      state.seed = seed;
    },
    SET_CONTENT_LIST(state, contentList) {
      state.contentList = contentList;
    },
    ADD_TO_SELECTED_EXERCISES(state, exercises) {
      state.selectedExercises = unionBy([...state.selectedExercises, ...exercises], 'id');
    },
    REMOVE_FROM_SELECTED_EXERCISES(state, exercises) {
      state.selectedExercises = state.selectedExercises.filter(
        resource => exercises.findIndex(exercise => exercise.id === resource.id) === -1
      );
    },
    SET_SELECTED_EXERCISES(state, exercises) {
      state.selectedExercises = unionBy(exercises, 'id');
    },
    SET_AVAILABLE_QUESTIONS(state, availableQuestions) {
      state.availableQuestions = availableQuestions;
    },
    SET_ANCESTORS(state, ancestors) {
      state.ancestors = [...ancestors];
    },
    SET_SEARCH_RESULTS(state, searchResults) {
      state.searchResults = searchResults;
    },
    SET_EXAMS_MODAL(state, modalName) {
      state.examsModalSet = modalName;
    },
    SET_CURRENT_CONTENT_NODE(state, contentNode) {
      state.currentContentNode = contentNode;
    },
    SET_PREVIEW_STATE(state, previewState) {
      state.preview = previewState;
    },
  },
};
