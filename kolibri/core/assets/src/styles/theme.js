import Vue from 'vue';
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

export const dynamicState = Vue.observable(initialState);

export function resetThemeValue(value) {
  dynamicState[value] = initialState[value];
}

export default {
  $coreActionNormal() {
    return dynamicState['$core-accent-color'];
  },
  $coreActionLight() {
    return dynamicState['$core-action-light'];
  },
  $coreActionDark() {
    return dynamicState['$core-action-dark'];
  },
  $coreAccentColor() {
    return dynamicState['$core-accent-color'];
  },
  $coreBgLight() {
    return lighten(dynamicState['$core-bg-canvas'], 0.025);
  },
  $coreBgCanvas() {
    return dynamicState['$core-bg-canvas'];
  },
  $coreTextDefault() {
    return dynamicState['$core-text-default'];
  },
  $coreTextAnnotation() {
    return lighten(dynamicState['$core-text-default'], 0.68);
  },
  $coreTextDisabled() {
    return lighten(dynamicState['$core-text-default'], 2.85);
  },
  $coreBgWarning() {
    return dynamicState['$core-bg-warning'];
  },
  $coreTextError() {
    return dynamicState['$core-text-error'];
  },
  $coreBgError() {
    return dynamicState['$core-bg-error'];
  },
  /* Status colors */
  $coreStatusProgress() {
    return dynamicState['$core-status-progress'];
  },
  $coreStatusMastered() {
    return dynamicState['$core-status-mastered'];
  },
  $coreStatusCorrect() {
    return dynamicState['$core-status-correct'];
  },
  $coreStatusWrong() {
    return dynamicState['$core-status-wrong'];
  },
  $coreGrey() {
    return dynamicState['$core-grey'];
  },
  $coreGrey200() {
    return lighten(dynamicState['$core-grey'], 0.063);
  },
  $coreGrey300() {
    return dynamicState['$core-grey'];
  },
  $coreLoading() {
    return dynamicState['$core-loading'];
  },
  // Should only use these styles to outline stuff that will be focused
  // on keyboard-tab-focus
  $coreOutline() {
    if (dynamicState.modality !== 'keyboard') {
      return {
        outline: 'none',
      };
    }

    return {
      outlineColor: darken(dynamicState['$core-action-light'], 0.1),
      outlineStyle: 'solid',
      outlineWidth: '3px',
      outlineOffset: '4px',
    };
  },
  // Should use this when the outline needs to be applied regardless
  // of modality
  $coreOutlineAnyModality() {
    return {
      outlineColor: darken(dynamicState['$core-action-light'], 0.1),
      outlineStyle: 'solid',
      outlineWidth: '3px',
      outlineOffset: '4px',
    };
  },
};
