import vue from 'vue';
import vuex from 'vuex';
import router from 'vue-router';
import vueintl from 'vue-intl';
import 'intl';
import 'intl/locale-data/jsonp/en.js';
import kRouter from 'kolibri.coreVue.router';

kRouter.init([]);

vue.prototype.Kolibri = {};
vue.config.silent = true;
vue.use(vuex);
vue.use(router);
vue.use(vueintl, { defaultLocale: 'en-us' });

function $trWrapper(nameSpace, defaultMessages, formatter, messageId, args) {
  if (args) {
    if (!Array.isArray(args) && typeof args !== 'object') {
      console.error(`The $tr functions take either an array of positional
                      arguments or an object of named options.`);
    }
  }
  const defaultMessageText = defaultMessages[messageId];
  const message = {
    id: `${nameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };

  return formatter(message, args);
}

vue.prototype.$tr = function $tr(messageId, args) {
  const nameSpace = this.$options.name || this.$options.$trNameSpace;
  return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
};

export default vue;
