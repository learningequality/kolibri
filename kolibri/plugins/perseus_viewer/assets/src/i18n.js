/*
 * Utils that wrap vue-intl functions in a way that makes them accessible to Perseus
 */

import { React } from '../dist/perseus';
import { removeBackslashesInString } from './translationUtils';
import translator from './translator';

// We sometimes need to translate messages without filling in their values
// Use this to generate the options for a translation that leaves the ICU format
// intact
// This may break for more complex ICU messages, but we don't have any in the KA
// specific strings as they are generated from simpler ngettext strings
const getVarOptions = message => {
  const options = {};
  const reg = /(?:\{([^}]+)\})/g;
  let match;
  while ((match = reg.exec(message))) {
    options[match[1].trim()] = match[0];
  }
  return options;
};

// Some KA messages have TeX inlined, which can include curly braces
// This confuses our format message machinery, so find the names that we
// need to in fill here
const getTexCurlyBraceOptions = message => {
  // This regex does not catch escaped $ signs, so could fail.
  const reg = /\$([^$]+)\$/g;
  let match;
  const options = {};
  while ((match = reg.exec(message))) {
    Object.assign(options, getVarOptions(match[1]));
  }
  return options;
};

// Adapted from perseus/lib/i18n.js

const interpolationMarker = /{ *([\w_]+) *}/g;
/**
 * Performs ICU-like { name } replacement on str, and returns a React
 * fragment of the string interleaved with those replacements. The replacements
 * can be any valid React node including strings and numbers.
 *
 * For example:
 *  interpolateStringToFragment("test", {}) ->
 *      test
 *  interpolateStringToFragment("test { num }", {num: 5}) ->
 *      test 5
 *  interpolateStringToFragment("test { num }", {num: <Count />}) ->
 *      test <Count />
 */
const interpolateStringToFragment = (str, options = {}) => {
  // Translate string, but without any values to preserve placeholders.
  str = removeBackslashesInString(str);
  str = translator.$tr(str, getVarOptions(str));

  // Split the string into its language fragments and substitutions
  const split = str.split(interpolationMarker);

  const result = { text_0: split[0] };

  let key, replaceWith, j;

  // Replace the substitutions with the appropriate option
  for (let i = 1; i < split.length; i += 2) {
    key = split[i];
    replaceWith = options[key];
    if (replaceWith === undefined) {
      replaceWith = '%(' + key + ')s';
    }

    // We prefix each substitution key with a number that increments each
    // time it's used, so "test { num } { fruit } and { num } again" turns
    // into an object with keys:
    // [text_0, 0_num, text_2, 0_fruit, text_4, 1_num, text_6]
    // This is better than just using the array index in the case that we
    // switch between two translated strings with the same variables.
    // Admittedly, an edge case.
    j = 0;
    while ('' + j + '_' + key in result) {
      j++;
    }

    result['' + j + '_' + key] = replaceWith;
    // Because the regex has one capturing group, the `split` array always
    // has an odd number of elements, so this always stays in bounds.
    result['text_' + (i + 1)] = split[i + 1];
  }

  return React.__internalAddons.createFragment(result);
};

export const $_ = (...args) => {
  const options = args[0];
  const str = args[1];
  if (args.length !== 2 || typeof str !== 'string') {
    return '<$_> must have exactly one child, which must be a string';
  }

  return interpolateStringToFragment(str, options);
};

/**
 * Simple i18n method with ICU-like { name } replacement
 * To be used like so:
 *   i18n._("Some string")
 *   i18n._("Hello { name }", {name: "John"})
 */
export const _ = (str, options = {}) => {
  // Sometimes we're given an argument that's meant for ngettext().  This
  // happens if the same string is used in both i18n._() and i18n.ngettext()
  // (.g. a = i18n._(foo); b = i18n.ngettext("foo", "bar", count);
  // In such cases, only the plural form ends up in the .po file, and
  // then it gets sent to us for the i18n._() case too.  No problem, though:
  // we'll just take the singular arg.
  if (typeof str === 'object' && str.messages) {
    str = str.messages[0];
  }

  Object.assign(options, getTexCurlyBraceOptions(str));

  str = removeBackslashesInString(str);
  return translator.$tr(str, options);
};
