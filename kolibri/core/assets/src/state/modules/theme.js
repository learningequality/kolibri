import { lighten, darken } from 'kolibri.utils.colour';

const initialState = {
  '$core-action-light': '#e2d1e0',
  '$core-action-dark': '#72486f',

  '$core-accent-color': '#996189',

  '$core-bg-canvas': '#f9f9f9',

  '$core-text-default': '#3a3a3a',

  '$core-bg-warning': '#fff3e1',

  '$core-text-error': '#b93329',
  '$core-bg-error': '#eeeeee',

  /* Status colors */
  '$core-status-progress': '#2196f3',
  '$core-status-mastered': '#ffc107',
  '$core-status-correct': '#4caf50',
  '$core-status-wrong': '#df4d4f',

  '$core-grey': '#e0e0e0',

  '$core-loading': '#03a9f4',
  modality: null,
};

export default {
  state: { ...initialState },
  getters: {
    $coreActionNormal(state) {
      return state['$core-accent-color'];
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
      return lighten(state['$core-bg-canvas'], 0.025);
    },
    $coreBgCanvas(state) {
      return state['$core-bg-canvas'];
    },
    $coreTextDefault(state) {
      return state['$core-text-default'];
    },
    $coreTextAnnotation(state) {
      return lighten(state['$core-text-default'], 0.68);
    },
    $coreTextDisabled(state) {
      return lighten(state['$core-text-default'], 2.85);
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
      return lighten(state['$core-grey'], 0.063);
    },
    $coreGrey300(state) {
      return state['$core-grey'];
    },
    $coreLoading(state) {
      return state['$core-loading'];
    },
    // Should only use these styles to outline stuff that will be focused
    // on keyboard-tab-focus
    $coreOutline(state) {
      if (state.modality !== 'keyboard') {
        return {
          outline: 'none',
        };
      }

      return {
        outlineColor: darken(state['$core-action-light'], 0.1),
        outlineStyle: 'solid',
        outlineWidth: '3px',
        outlineOffset: '4px',
      };
    },
    // Should use this when the outline needs to be applied regardless
    // of modality
    $coreOutlineAnyModality(state) {
      return {
        outlineColor: darken(state['$core-action-light'], 0.1),
        outlineStyle: 'solid',
        outlineWidth: '3px',
        outlineOffset: '4px',
      };
    },
  },
  mutations: {
    SET_CORE_THEME(state, theme) {
      Object.assign(state, theme);
    },
    RESET_THEME_VALUE(state, varName) {
      state[varName] = initialState[varName];
    },
    SET_MODALITY(state, modality) {
      state.modality = modality;
    },
  },
};
