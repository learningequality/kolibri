import logger from 'kolibri.lib.logging';
import globalState from './globalState';
import materialColors from './materialColors';

const logging = logger.getLogger(__filename);

const staticState = {
  modality: null,
  colors: {
    palette: materialColors,
    brand: global.kolibriTheme.brandColors,
  },
  tokenMapping: Object.assign(
    {
      // brand shortcuts
      primary: 'brand.primary.v_400',
      primaryDark: 'brand.primary.v_700',

      // UI colors
      text: 'palette.grey.v_900',
      textDisabled: 'palette.grey.v_300',
      annotation: 'palette.grey.v_700',
      textInverted: 'palette.white',
      loading: 'brand.secondary.v_200',
      focusOutline: 'brand.secondary.v_200',
      surface: 'palette.white',
      fineLine: '#dedede',

      // general semantic colors
      error: 'palette.red.v_700',
      success: 'palette.green.v_700',

      // Kolibri-specific semantic colors
      progress: 'palette.lightblue.v_500',
      mastered: 'palette.amber.v_500',
      correct: 'palette.green.v_600',
      incorrect: 'palette.red.v_800',
      coachContent: 'palette.lightblue.v_800',
      superAdmin: 'palette.amber.v_600',

      // content colors
      exercise: 'palette.cyan.v_600',
      video: 'palette.indigo.v_700',
      audio: 'palette.pink.v_400',
      document: 'palette.deeporange.v_600',
      html5: 'palette.yellow.v_800',
      topic: 'palette.grey.v_800',
      slideshow: 'palette.green.v_400',
    },
    global.kolibriTheme.tokenMapping
  ),
};

function throwThemeError(tokenName, mapString) {
  throw `Theme issue: '${tokenName}' has invalid mapping '${mapString}'`;
}

const hexcolor = RegExp('#[0-9a-fA-F]{6}');

function getTokens() {
  const tokens = {};
  // look at each token map
  Object.keys(staticState.tokenMapping).forEach(function(tokenName) {
    const mapString = staticState.tokenMapping[tokenName];
    // if it doesn't look like a path, interpret value as a CSS color value
    if (mapString.indexOf('.') === -1) {
      tokens[tokenName] = mapString;
      return;
    }
    // otherwise try to use the dot notation to navigate down the color tree
    const refs = mapString.split('.');
    let obj = staticState.colors;
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

const tokens = getTokens();

export function themeTokens() {
  return tokens;
}

export function themeTokenMapping() {
  return staticState.tokenMapping;
}

export function themeBrand() {
  return staticState.colors.brand;
}

export function themePalette() {
  return staticState.colors.palette;
}

export function theme() {
  return global.kolibriTheme;
}

// outline for keyboard-modality tab-focus
export function themeOutlineStyle() {
  if (globalState.inputModality !== 'keyboard') {
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
}
