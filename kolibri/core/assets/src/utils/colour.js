import { color } from 'd3-color';

// D3 Color uses power ratios for its brighter and darker
// functions, define the logs of the bases here to reduce
// calculations in future.
// Precalculating per recommendation here:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log#Description
const lightenLogBase = Math.log(1 / 0.7);

const darkenLogBase = Math.log(0.7);

function _modifyColour(sourceColour, ratio, colourFn, name) {
  sourceColour = color(sourceColour);
  if (sourceColour !== null) {
    let parsedRatio = null;
    if (isNaN(Number(ratio))) {
      const percentRegex = /^([0-9]+\.?[0-9]*)%/;
      const result = percentRegex.exec(ratio);
      if (result !== null) {
        parsedRatio = 0.01 * Number(result[1]);
      }
    } else {
      parsedRatio = Number(ratio);
    }
    if (parsedRatio !== null) {
      return colourFn(sourceColour, ratio).toString();
    }
    throw TypeError(`Unparseable ratio: ${ratio} passed to ${name} function`);
  }
  throw TypeError(`Unparseable colour: ${sourceColour} passed to ${name} function`);
}

function _lighten(sourceColour, ratio) {
  return sourceColour.brighter(Math.log(1 + ratio) / lightenLogBase);
}

export function lighten(sourceColour, ratio) {
  return _modifyColour(sourceColour, ratio, _lighten, 'lighten');
}

function _darken(sourceColour, ratio) {
  return sourceColour.brighter(Math.log(1 - ratio) / darkenLogBase);
}

export function darken(sourceColour, ratio) {
  return _modifyColour(sourceColour, ratio, _darken, 'darken');
}
