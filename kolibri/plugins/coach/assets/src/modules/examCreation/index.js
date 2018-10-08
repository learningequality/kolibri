import unionBy from 'lodash/unionBy';
import union from 'lodash/union';
import * as actions from './actions';

function defaultState() {
  return {
    title: '',
    numberOfQuestions: null,
    seed: null,
    contentList: [],
    selectedExercises: [],
    availableQuestions: 0,
    searchResults: {
      channel_ids: [],
      content_kinds: [],
      results: [],
      total_results: 0,
    },
    ancestors: [],
    ancestorCounts: {},
    examsModalSet: false,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    numRemainingSearchResults(state) {
      return state.searchResults.total_results - state.searchResults.results.length;
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
    SET_ANCESTOR_COUNTS(state, ancestorCountsObject) {
      state.ancestorCounts = ancestorCountsObject;
    },
    SET_SEARCH_RESULTS(state, searchResults) {
      state.searchResults = searchResults;
    },
    SET_ADDITIONAL_SEARCH_RESULTS(state, searchResults) {
      // Append the new results
      state.searchResults.results = unionBy(
        [...state.searchResults.results, ...searchResults.results],
        'id'
      );
      // Append the filters
      state.searchResults.channel_ids = union(
        state.searchResults.channel_ids,
        searchResults.channel_ids
      );
      // NOTE: Don't update total_results. Must keep the value set initially
      // for remainingSearchResults to work properly
    },
    SET_EXAMS_MODAL(state, modalName) {
      state.examsModalSet = modalName;
    },
  },
};
