import vue from 'vue';
import vuex from 'vuex';
import router from 'vue-router';
import vueintl from 'vue-intl';

vue.prototype.Kolibri = {};
vue.config.silent = true;
vue.use(vuex);
vue.use(router);
require('intl');
require('intl/locale-data/jsonp/en.js');
vue.use(vueintl, { defaultLocale: 'en-us' });

vue.mixin({
  store: new vuex.Store({}),
});

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

export default vue;
