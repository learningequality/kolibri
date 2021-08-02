/*
 * A utility that extracts Perseus messages into a Javascript file for compatibility
 * with our i18n machinery. Also converts them into ICU format in the process.
 */

// We already have lodash installed, so use it for templating the code we generate
const lodash = require('lodash');

const { writeSourceToFile } = require('kolibri-tools/lib/i18n/utils');

const gettextToICU = require('./gettextToICU');

const getMessages = require('./getMessages');
const translationUtils = require('./assets/src/translationUtils');
// Auto generate a module that creates the translator so that it can
// be imported into our special i18n code for Perseus.

const template = `

import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('PerseusInternalMessages', {
<% _.each(transformedMessages, function(value, key) { %>  <%= key %>: <%= value %>,\n<% }); %>});

export default translator;`;

module.exports = function() {
  return getMessages(gettextToICU).then(messages => {
    const transformedMessages = translationUtils.removeBackslashesFromKeys(messages);
    // Use lodash template to fill in the above 'messages' into the template
    const outputCode = lodash.template(template)({ transformedMessages });

    // Write out the module to src files

    writeSourceToFile('./assets/src/translator.js', outputCode);
  });
}
