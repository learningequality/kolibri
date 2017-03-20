module.exports = (locale, callback) => {
  switch (locale) {
    case 'fr-FR':
      return new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/fr-FR.js'));
        });
      });
    case 'pt-PT':
      return new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/pt-PT.js'));
        });
      });
    case 'sw-TZ':
      return new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/sw-TZ.js'));
        });
      });
    case 'es-ES':
      return new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/es-ES.js'));
        });
      });
    default:
      return new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/en.js'));
        });
      });
  }
};
