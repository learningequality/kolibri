module.exports = locale => {
  switch (locale) {
    case 'fr-FR':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/fr.js'],
          require => {
            resolve(require('vue-intl/locale-data/fr.js'));
          },
          'fr-FR'
        );
      });
    case 'sw-TZ':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/sw.js'],
          require => {
            resolve(require('vue-intl/locale-data/sw.js'));
          },
          'sw-SW'
        );
      });
    case 'es-ES':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/es.js'],
          require => {
            resolve(require('vue-intl/locale-data/es.js'));
          },
          'es-ES'
        );
      });
    case 'ar':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/ar.js'],
          require => {
            resolve(require('vue-intl/locale-data/ar.js'));
          },
          'ar'
        );
      });
    case 'fa':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/fa.js'],
          require => {
            resolve(require('vue-intl/locale-data/fa.js'));
          },
          'fa'
        );
      });
    case 'ur-PK':
      return new Promise(resolve => {
        require.ensure(
          ['vue-intl/locale-data/ur.js'],
          require => {
            resolve(require('vue-intl/locale-data/ur.js'));
          },
          'ur-PK'
        );
      });
    default:
      return Promise.resolve({});
  }
};
