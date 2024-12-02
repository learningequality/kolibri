/*
 * A utility that extracts Perseus messages into a Javascript file for compatibility
 * with our i18n machinery. Also converts them into ICU format in the process.
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');


// We already have lodash installed, so use it for templating the code we generate
const lodash = require('lodash');

const typescript = require('typescript');

const { writeSourceToFile } = require('kolibri-format');

const { replacePiText } = require('./assets/src/translationUtils');
const packageJson = require('./package.json');

const perseusVersion = packageJson.dependencies['@khanacademy/perseus'];

// Auto generate a module that creates the translator so that it can
// be imported into our special i18n code for Perseus.

const perseusStringFileUrl = `https://raw.githubusercontent.com/Khan/perseus/@khanacademy/perseus@${perseusVersion}/packages/perseus/src/strings.ts`;
const mathInputStringFileUrl = `https://raw.githubusercontent.com/Khan/perseus/@khanacademy/perseus@${perseusVersion}/packages/math-input/src/strings.ts`;

// Regex taken from perseus/lib/i18n.js interpolationMarker variable
const gettextRegex = /%\(([\w_]+)\)s/g;

/*
 * A function to transform Perseus' gettext formatted messages to ICU message syntax
 * Can be used replace all strings in a source file,
 * Or on a string by string basis to convert gettext formatted strings into ICU syntax,
 * For example when importing Khan Academy's gettext format translated strings.
 * It also normalizes the way pi is represented to make it not cause errors for ICU message syntax.
 * Finally, it escapes all backslashes to prevent errors in ICU token parsing.
 */
function normalizeString(string) {
  return replacePiText(string.replace(gettextRegex, '{ $1 }')).replace(/\\/g, '\\\\');
}

function normalizeStringObject(stringObject) {
  const normalizedObject = {};
  for (const key in stringObject) {
    if (lodash.isPlainObject(stringObject[key])) {
      if (stringObject[key]['message']) {
        normalizedObject[key] = {
          message: normalizeString(stringObject[key]['message']),
          context: stringObject[key]['context'],
        };
      } else if (stringObject[key]['one'] && stringObject[key]['other']) {
        const oneMessage = normalizeString(stringObject[key]['one']).trim();
        const otherMessage = normalizeString(stringObject[key]['other']).trim();
        const varName = gettextRegex.exec(stringObject[key]['one'])[1];
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


async function downloadFileAndGetMessages(urlPath, moduleName) {
  try {
    const data = await new Promise((resolve, reject) => {
      const req = https.get(encodeURI(urlPath), (res) => {
        if (res.statusCode !== 200) {
          console.error('Error downloading file:', res);
          return;
        }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      });
      req.on('error', (error) => reject(error));
      req.end();
    });
    const tempFilePath = path.join(__dirname, moduleName + 'tempFile.js');
    const jsSource = typescript.transpileModule(data.toString(), { compilerOptions: { module: typescript.ModuleKind.CommonJS }});
    fs.writeFileSync(tempFilePath, Buffer.from(jsSource.outputText));
    const module = require(tempFilePath);
    fs.unlinkSync(tempFilePath);
    return normalizeStringObject(module.strings);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

module.exports = async function() {
  const perseusStrings = await downloadFileAndGetMessages(perseusStringFileUrl, 'perseus');
  const mathInputStrings = await downloadFileAndGetMessages(mathInputStringFileUrl, 'mathInput');

  const allStrings = {
    ...perseusStrings,
    // There is one duplicate key between the two files
    // we will prefer the math input one for now, as it seems more useful.
    ...mathInputStrings,
  };

  for (const key in allStrings) {
    if (perseusStrings[key] && mathInputStrings[key] && perseusStrings[key] !== mathInputStrings[key]) {
      if (lodash.isPlainObject(perseusStrings[key]) && lodash.isPlainObject(mathInputStrings[key])) {
        if (perseusStrings[key].message === mathInputStrings[key].message && perseusStrings[key].context === mathInputStrings[key].context) {
          continue;
        }
      }
      console.error('Duplicate key found:', key);
      console.error('Perseus:', perseusStrings[key]);
      console.error('Math Input:', mathInputStrings[key]);
    }
  }

  // Use lodash template to fill in the above 'messages' into the template
  let outputCode = `

  import { createTranslator } from 'kolibri.utils.i18n';


  export default createTranslator('PerseusInternalMessages',
    `;
  outputCode += JSON.stringify(allStrings, null, 2);
  outputCode += ');'

  // Write out the module to src files

  writeSourceToFile('./assets/src/translator.js', outputCode);
}
