module.exports = (locale, callback) => {
  switch (locale) {
    case 'fr-FR':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/fr-FR.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/fr-FR.js'));
          },
          'fr-FR'
        );
      });
    case 'pt-PT':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/pt-PT.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/pt-PT.js'));
          },
          'pt-PT'
        );
      });
    case 'sw-TZ':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/sw-TZ.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/sw-TZ.js'));
          },
          'sw-SW'
        );
      });
    case 'es-ES':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/es-ES.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/es-ES.js'));
          },
          'es-ES'
        );
      });
    case 'es-MX':
      return new Promise(resolve => {
        require.ensure([], require => {
          resolve(() => require('intl/locale-data/jsonp/es-MX.js'));
        });
      });
    default:
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
