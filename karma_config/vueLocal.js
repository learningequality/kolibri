const vue = require('../node_modules/vue');
const vuex = require('vuex');
const router = require('vue-router');
const vueintl = require('vue-intl');

vue.prototype.Kolibri = require('kolibri');
vue.use(vuex);
vue.use(router);
require('intl');
require('intl/locale-data/jsonp/en.js');
vue.use(vueintl, { defaultLocale: 'en-us' });

function $trWrapper(formatter, messageId, args) {
  if (args) {
    if (!Array.isArray(args) && typeof args !== 'object') {
      logging.error(`The $tr functions take either an array of positional
                      arguments or an object of named options.`);
    }
  }
  const defaultMessageText = this.$options.$trs[messageId];
  const message = {
    id: `${this.$options.$trNameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };
  return formatter(message, args);
}

vue.prototype.$tr = function $tr(messageId, args) {
  return $trWrapper.call(this, this.$formatMessage, messageId, args);
};
vue.prototype.$trHtml = function $trHtml(messageId, args) {
  return $trWrapper.call(this, this.$formatHTMLMessage, messageId, args);
};

module.exports = vue;
