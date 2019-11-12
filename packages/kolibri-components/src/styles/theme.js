import logger from 'kolibri.lib.logging';
import globalThemeState from './globalThemeState';

const logging = logger.getLogger(__filename);

function throwThemeError(tokenName, mapString) {
  throw `Theme issue: '${tokenName}' has invalid mapping '${mapString}'`;
}

const HEX_COLOR_PATTERN = RegExp('#[0-9a-fA-F]{6}');

const tokens = {};

/*
 * Maps tokens to specific hex values
 */
function generateTokenToColorMapping() {
  const newTokens = {};
  // look at each token map
  Object.keys(globalThemeState.tokenMapping).forEach(function(tokenName) {
    const mapString = globalThemeState.tokenMapping[tokenName];
    // if it doesn't look like a path, interpret value as a CSS color value
    if (mapString.indexOf('.') === -1) {
      newTokens[tokenName] = mapString;
      return;
    }
    // otherwise try to use the dot notation to navigate down the color tree
    const refs = mapString.split('.');
    let obj = globalThemeState.colors;
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
    if (!HEX_COLOR_PATTERN.test(obj)) {
      logging.warn(`Theme issue: Unexpected value '${obj}' for token '${tokenName}'`);
    }
    // if we end up at a valid string, use it
    newTokens[tokenName] = obj;
  });
  Object.assign(tokens, newTokens);
  return tokens;
}

generateTokenToColorMapping();

export function themeTokens() {
  return tokens;
}

export function themeBrand() {
  return globalThemeState.colors.brand;
}

export function themePalette() {
  return globalThemeState.colors.palette;
}

// outline for keyboard-modality tab-focus
export function themeOutlineStyle() {
  return {
    outlineColor: tokens.focusOutline,
    outlineStyle: 'solid',
    outlineWidth: '3px',
    outlineOffset: '4px',
  };
}

export function setBrandColors(brandColors) {
  globalThemeState.colors.brand = brandColors;
  generateTokenToColorMapping();
}

export function setTokenMapping(tokenMapping) {
  Object.assign(globalThemeState.tokenMapping, tokenMapping);
  generateTokenToColorMapping();
}
