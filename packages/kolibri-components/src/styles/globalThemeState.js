import Vue from 'vue';

import { defaultBrandColors, defaultTokenMapping } from './colorsDefault';
import materialColors from './colorsMaterial';

const globalThemeState = Vue.observable({
  inputModality: null, // track whether the user is navigating with the keyboard or not
  colors: {
    palette: materialColors,
    brand: defaultBrandColors,
  },
  tokenMapping: defaultTokenMapping,
});

export default globalThemeState;
