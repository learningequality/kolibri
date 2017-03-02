module.exports = (locale, callback) => {
  switch (locale) {
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
