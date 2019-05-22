import Vue from 'vue';
import logger from 'kolibri.lib.logging';

import materialColors from './materialColors.js';
import brandColors from './brandColors.js';

const logging = logger.getLogger(__filename);

const initialState = {
  modality: null,
  colors: {
    black: 'black',
    white: 'white',
    palette: materialColors,
    brand: brandColors,
  },
  tokenMapping: {
    // brand shortcuts
    primary: 'brand.primary.v_400',
    primaryLight: 'brand.primary.v_100',
    primaryDark: 'brand.primary.v_700',
    secondary: 'brand.secondary.v_400',
    secondaryLight: 'brand.secondary.v_100',
    secondaryDark: 'brand.secondary.v_700',

    // UI colors
    text: 'palette.grey.v_900',
    textDisabled: 'palette.grey.v_300',
    annotation: 'palette.grey.v_700',
    loading: 'brand.secondary.v_400',
    focusOutline: 'brand.secondary.v_200',

    // general semantic colors
    error: 'palette.red.v_700',
    success: 'palette.green.v_600',

    // Kolibri-specific semantic colors
    progress: 'palette.lightblue.v_500',
    mastered: 'palette.amber.v_500',
    correct: 'palette.green.v_600',
    incorrect: 'palette.red.v_800',
  },
};

export const dynamicState = Vue.observable(initialState);

export function resetThemeValue(value) {
  dynamicState[value] = initialState[value];
}

function throwThemeError(tokenName, mapString) {
  throw `Theme issue: '${tokenName}' has invalid mapping '${mapString}'`;
}

const hexcolor = RegExp('#[0-9a-fA-F]{6}');

function getTokens() {
  const tokens = {};
  // look at each token map
  Object.keys(dynamicState.tokenMapping).forEach(function(tokenName) {
    const mapString = dynamicState.tokenMapping[tokenName];
    const refs = mapString.split('.');
    // try to use the dot notation to navigate down the color tree
    let obj = dynamicState.colors;
    while (refs.length) {
      const key = refs.shift();
      if (!obj[key]) {
        throwThemeError(tokenName, mapString);
      }
      obj = obj[key];
    }
    if (typeof obj !== 'string') {
      throwThemeError(tokenName, mapString);
    }
    if (!hexcolor.test(obj)) {
      logging.warn(`Theme issue: Unexpected value '${obj}' for token '${tokenName}'`);
    }
    // if we end up at a valid string, use it
    tokens[tokenName] = obj;
  });
  return tokens;
}

export default {
  $themeTokens() {
    return getTokens();
  },
  $themeColors() {
    return dynamicState.colors;
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
      outlineColor: getTokens().focusOutline,
      outlineStyle: 'solid',
      outlineWidth: '3px',
      outlineOffset: '4px',
    };
  },
  // Should use this when the outline needs to be applied regardless
  // of modality
  $coreOutlineAnyModality() {
    return {
      outlineColor: getTokens().focusOutline,
      outlineStyle: 'solid',
      outlineWidth: '3px',
      outlineOffset: '4px',
    };
  },
};
