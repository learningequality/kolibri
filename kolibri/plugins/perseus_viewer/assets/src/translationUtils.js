const transform = require('lodash/transform');

function escapeBackslashesInString(string) {
  return string.replace(/\\/g, '\\\\');
}

function removeBackslashesInString(string) {
  return string.replace(/\\/g, '');
}

function removeBackslashesFromKeys(object) {
  return transform(object, function(result, val, key) {
    const newKey = removeBackslashesInString(key);
    result[newKey] = val;
  });
}

const piRegex = /text\{pi\}/g;
const piTextPlaceholder = 'text[pi]';

module.exports = {
  escapeBackslashesInString,
  removeBackslashesInString,
  removeBackslashesFromKeys,
  piTextPlaceholder,
  piRegex,
};
