const vue = require('kolibri.lib.vue');

let decimal_separator, grouping_separator, minus;

module.exports = {
  getDecimalFormatSymbols() {
    return {
      decimal_separator,
      grouping_separator,
      minus,
    };
  },
  setIcuSymbols() {
    // Infer the decimal separator for this locale
    decimal_separator = vue.prototype.$formatNumber(1.1).replace(
      // eslint-disable-line camelcase
      new RegExp(vue.prototype.$formatNumber(1), 'g')
    );

    // Attempt to infer grouping separator
    grouping_separator = vue.prototype
      .$formatNumber(1000, {
        // eslint-disable-line camelcase
        useGrouping: true,
      })
      .split()
      .reduce((acc, item) => acc.replace(item, ''), vue.prototype.$formatNumber(1000));

    // Attempt to infer the minus symbol
    minus = vue.prototype.$formatNumber(-1).replace(vue.prototype.$formatNumber(1), '');
  },
};
