const path = require('path');
const fs = require('fs');

const supportedLanguages = require('../../kolibri/locale/supported_languages.json');

const vueIntlHeader = `module.exports = function (locale) {
  switch (locale) {`;

const generateVueIntlItems = language => {
  const language_code = language.language_code;
  // Language territory uses upper case
  const language_territory_string = language.territory_code
    ? '-' + language.territory_code.toUpperCase()
    : '';
  /*
   * Generate entries of this form:
   * case 'sw':
   *  return new Promise(function (resolve) {
   *    require.ensure(
   *      ['vue-intl/locale-data/sw.js'],
   *      function (require) {
   *        resolve(require('vue-intl/locale-data/sw.js'));
   *      }
   *    );
   *  });
   */
  return `
    case '${language_code}${language_territory_string}':
      return new Promise(function (resolve) {
        require.ensure(
          ['vue-intl/locale-data/${language_code}.js'],
          function (require) {
            resolve(require('vue-intl/locale-data/${language_code}.js'));
          }
        );
      });`;
};

const vueIntlFooter = `
    default:
      return Promise.resolve({});
  }
};
`;

const vueIntlModule =
  vueIntlHeader + supportedLanguages.map(generateVueIntlItems).join('') + vueIntlFooter;

const vueIntlModulePath = path.resolve(
  __dirname,
  '../../kolibri/core/assets/src/utils/vue-intl-locale-data.js'
);

const intlHeader = `module.exports = function(locale) {
  switch (locale) {`;

const generateIntlItems = language => {
  /*
   * Generate entries of the form:
   * case 'sw-TZ':
   *   return new Promise(function(resolve) {
   *     require.ensure(
   *       ['intl/locale-data/jsonp/sw-TZ.js'],
   *       function(require) {
   *         resolve(require('intl/locale-data/jsonp/sw-TZ.js'));
   *       }
   *     );
   *   });
   */
  const language_code = language.language_code;
  // Language script uses title case
  const language_script_string = language.script_code
    ? '-' + language.script_code[0].toUpperCase() + language.script_code.slice(1)
    : '';
  // Language territory uses upper case
  const language_territory_string = language.territory_code
    ? '-' + language.territory_code.toUpperCase()
    : '';
  return `
    case '${language_code}${language_script_string}${language_territory_string}':
      return new Promise(function(resolve) {
        require.ensure(
          ['intl/locale-data/jsonp/${language_code}${language_script_string}${language_territory_string}.js'],
          function(require) {
            resolve(require('intl/locale-data/jsonp/${language_code}${language_script_string}${language_territory_string}.js'));
          }
        );
      });`;
};

const intlFooter = `
    default:
      return new Promise(function(resolve) {
        require.ensure(
          ['intl/locale-data/jsonp/en.js'],
          function(require) {
            resolve(require('intl/locale-data/jsonp/en.js'));
          }
        );
      });
  }
};
`;

const intlModule = intlHeader + supportedLanguages.map(generateIntlItems).join('') + intlFooter;

const intlModulePath = path.resolve(
  __dirname,
  '../../kolibri/core/assets/src/utils/intl-locale-data.js'
);

fs.writeFileSync(vueIntlModulePath, vueIntlModule, { encoding: 'utf-8' });

fs.writeFileSync(intlModulePath, intlModule, { encoding: 'utf-8' });
