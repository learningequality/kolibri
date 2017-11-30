module.exports = locale => {
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
    case 'ar':
      return new Promise(resolve => {
        require.ensure(
          ['intl/locale-data/jsonp/ar.js'],
          require => {
            resolve(() => require('intl/locale-data/jsonp/ar.js'));
          },
          'ar'
        );
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
