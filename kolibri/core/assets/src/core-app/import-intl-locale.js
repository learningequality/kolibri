module.exports = (locale, callback) => {
  let promise;
  switch (locale) {
    case 'sw-TZ':
      promise = new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/sw-TZ.js'));
        });
      });
      break;
    case 'es-ES':
      promise = new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/es-ES.js'));
        });
      });
      break;
    default:
      promise = new Promise((resolve) => {
        require.ensure([], (require) => {
          resolve(() => require('intl/locale-data/jsonp/en.js'));
        });
      });
      break;
  }
  return promise;
};
