/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
/*
 * Extracts Perseus and math-input strings into a translator module compatible
 * with our i18n machinery. Reads the strings objects straight out of each
 * package's built dist, converts gettext-style %(name)s tokens to ICU syntax,
 * and preserves any `context` values already present in the existing
 * translator.js so hand-maintained context notes survive re-runs.
 */
const fs = require('node:fs');
const path = require('node:path');

const lodash = require('lodash');

const { writeSourceToFile } = require('kolibri-format');

const { replacePiText } = require('./frontend/translationUtils');

// Regex taken from perseus/lib/i18n.js interpolationMarker variable
const gettextRegex = /%\(([\w_]+)\)s/g;

function normalizeString(string) {
  return replacePiText(string.replace(gettextRegex, '{ $1 }')).replace(/\\/g, '\\\\');
}

function normalizeStringObject(stringObject) {
  const normalizedObject = {};
  for (const key in stringObject) {
    if (lodash.isPlainObject(stringObject[key])) {
      if (stringObject[key].message) {
        normalizedObject[key] = {
          message: normalizeString(stringObject[key].message),
          context: stringObject[key].context,
        };
      } else if (stringObject[key].one && stringObject[key].other) {
        const oneMessage = normalizeString(stringObject[key].one).trim();
        const otherMessage = normalizeString(stringObject[key].other).trim();
        const varName = gettextRegex.exec(stringObject[key].one)[1];
        normalizedObject[key] = `{${varName}, plural, one {${oneMessage}} other {${otherMessage}}}`;
      } else {
        console.error('Unrecognized string object:', stringObject[key]);
      }
    } else if (typeof stringObject[key] === 'string') {
      normalizedObject[key] = normalizeString(stringObject[key]);
    }
  }
  return normalizedObject;
}

const translatorPath = path.join(__dirname, 'frontend/translator.js');

// Capture contexts from the existing translator.js by stubbing createTranslator
// and evaluating the file. Upstream flattened several strings to plain values in
// v75, so preserving our own contexts is the only way to keep them.
function readExistingContexts() {
  if (!fs.existsSync(translatorPath)) return {};
  const source = fs.readFileSync(translatorPath, 'utf8');
  const captured = {};
  const stub = (_name, strings) => Object.assign(captured, strings);
  const evaluate = new Function('createTranslator', `
    ${source.replace(/^import\s+.*$/gm, '').replace(/export\s+default\s+/, 'return ')}
  `);
  try {
    evaluate(stub);
  } catch (err) {
    console.error('Could not parse existing translator.js for context preservation:', err);
    return {};
  }
  const contexts = {};
  for (const key of Object.keys(captured)) {
    if (lodash.isPlainObject(captured[key]) && captured[key].context) {
      contexts[key] = captured[key].context;
    }
  }
  return contexts;
}

function applyPreservedContexts(allStrings, existingContexts) {
  for (const key of Object.keys(existingContexts)) {
    const ctx = existingContexts[key];
    const current = allStrings[key];
    if (typeof current === 'string') {
      allStrings[key] = { message: current, context: ctx };
    } else if (lodash.isPlainObject(current) && !current.context) {
      current.context = ctx;
    }
  }
}

module.exports = function extractPerseusMessages() {
  const perseusStrings = normalizeStringObject(
    require('@khanacademy/perseus/strings').strings,
  );
  const mathInputStrings = normalizeStringObject(
    require('@khanacademy/math-input/strings').strings,
  );

  const allStrings = {
    ...perseusStrings,
    // There is one duplicate key between the two files; prefer math-input.
    ...mathInputStrings,
  };

  for (const key in allStrings) {
    if (
      perseusStrings[key] &&
      mathInputStrings[key] &&
      perseusStrings[key] !== mathInputStrings[key]
    ) {
      if (lodash.isPlainObject(perseusStrings[key]) && lodash.isPlainObject(mathInputStrings[key])) {
        if (
          perseusStrings[key].message === mathInputStrings[key].message &&
          perseusStrings[key].context === mathInputStrings[key].context
        ) {
          continue;
        }
      }
      console.error('Duplicate key found:', key);
      console.error('Perseus:', perseusStrings[key]);
      console.error('Math Input:', mathInputStrings[key]);
    }
  }

  applyPreservedContexts(allStrings, readExistingContexts());

  const outputCode =
    "\n\n  import { createTranslator } from 'kolibri/utils/i18n';\n\n\n  export default createTranslator('PerseusInternalMessages',\n    " +
    JSON.stringify(allStrings, null, 2) +
    ');';

  writeSourceToFile('./frontend/translator.js', outputCode);
};
