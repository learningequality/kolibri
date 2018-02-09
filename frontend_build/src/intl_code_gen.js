const supportedLanguages = require('../../kolibri/locale/supported_languages.json');

const vueIntlHeader = `module.exports = locale => {
  switch (locale) {`;

const generateVueIntlItems = language => {
  return `    case '${language.language_code}${
    language.language_territory ? '-' + language.language_territory.toUpperCase() : ''
  }':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/${language.language_code}.js'],
          require => {
            resolve(require('vue-intl/locale-data/${language.language_code}.js'));
          }
        );
      });`;
};

const vueIntlFooter = `    default:
      return Promise.resolve({});
  }
};
`;

const vueIntlModule =
  vueIntlHeader + supportedLanguages.map(generateVueIntlItems).join('') + vueIntlFooter;

const intlHeader = `module.exports = locale => {
  switch (locale) {`;

const generateIntlItems = language => {
  return `    case '${language.language_code}${
    language.language_territory ? '-' + language.language_territory.toUpperCase() : ''
  }':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/${language.language_code}${
    language.language_territory ? '-' + language.language_territory.toUpperCase() : ''
  }.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/${language.language_code}${
    language.language_territory ? '-' + language.language_territory.toUpperCase() : ''
  }.js'));
          }
        );
      });`;
};

const intlFooter = `    default:
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/en.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/en.js'));
          },
          'en'
        );
      });
  }
};
`;

const intlModule = intlHeader + supportedLanguages.map(generateIntlItems).join('') + intlFooter;

module.exports = {
  intlModule,
  vueIntlModule,
};
