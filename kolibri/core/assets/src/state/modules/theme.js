export default {
  state: {
    '$core-action-normal': '#996189',
    '$core-action-light': '#e2d1e0',
    '$core-action-dark': '#72486f',

    '$core-accent-color': '#996189',

    '$core-bg-light': '#ffffff',
    '$core-bg-canvas': '#f9f9f9',

    '$core-text-default': '#3a3a3a',
    '$core-text-annotation': '#616161',
    '$core-text-disabled': '#dfdfdf',

    '$core-bg-warning': '#fff3e1',

    '$core-text-error': '#b93329',
    '$core-bg-error': '#eeeeee',

    /* Status colors */
    '$core-status-progress': '#2196f3',
    '$core-status-mastered': '#ffc107',
    '$core-status-correct': '#4caf50',
    '$core-status-wrong': '#df4d4f',

    '$core-grey': '#e0e0e0',

    '$core-grey-200': '#eeeeee',
    '$core-grey-300': '#e0e0e0',

    '$core-loading': '#03a9f4',
  },
  getters: {
    $coreActionNormal(state) {
      return state['$core-action-normal'];
    },
    $coreActionLight(state) {
      return state['$core-action-light'];
    },
    $coreActionDark(state) {
      return state['$core-action-dark'];
    },
    $coreAccentColor(state) {
      return state['$core-accent-color'];
    },
    $coreBgLight(state) {
      return state['$core-bg-light'];
    },
    $coreBgCanvas(state) {
      return state['$core-bg-canvas'];
    },
    $coreTextDefault(state) {
      return state['$core-text-default'];
    },
    $coreTextAnnotation(state) {
      return state['$core-text-annotation'];
    },
    $coreTextDisabled(state) {
      return state['$core-text-disabled'];
    },
    $coreBgWarning(state) {
      return state['$core-bg-warning'];
    },
    $coreTextError(state) {
      return state['$core-text-error'];
    },
    $coreBgError(state) {
      return state['$core-bg-error'];
    },
    /* Status colors */
    $coreStatusProgress(state) {
      return state['$core-status-progress'];
    },
    $coreStatusMastered(state) {
      return state['$core-status-mastered'];
    },
    $coreStatusCorrect(state) {
      return state['$core-status-correct'];
    },
    $coreStatusWrong(state) {
      return state['$core-status-wrong'];
    },
    $coreGrey(state) {
      return state['$core-grey'];
    },
    $coreGrey200(state) {
      return state['$core-grey-200'];
    },
    $coreGrey300(state) {
      return state['$core-grey-300'];
    },
    $coreLoading(state) {
      return state['$core-loading'];
    },
    $coreOutline(state) {
      return `${state['$core-action-light']} 2px solid`;
    },
  },
  mutations: {},
};
