import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';
import kolibri from 'kolibri';
import getPluginData from 'kolibri.utils.getPluginData';
import Vue from 'kolibri.lib.vue';
import logger from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import { currentLanguage } from 'kolibri.utils.i18n';

const logging = logger.getLogger(__filename);

const pluginData = getPluginData();

if (pluginData.sentryDSN) {
  Sentry.init({
    dsn: pluginData.sentryDSN,
    environment: pluginData.sentryEnv,
    release: kolibri.version,
    integrations: [new SentryIntegrations.Vue({ Vue })],
    beforeSend: (event, hint) => {
      logging.error('Sending error to Sentry:');
      logging.error(event);
      logging.error(hint);
      return event;
    },
  });
  Sentry.configureScope(scope => {
    scope.setTag('lang', currentLanguage);
    scope.setTag('host', window.location.hostname);
  });
  logging.warn('Sentry error logging is enabled - this makes console errors less readable');
  store.watch(state => state.error, errorString => {
    if (errorString) {
      Sentry.captureException(errorString);
    }
  });
  store.watch(state => state.session, session => {
    Sentry.configureScope(scope => {
      scope.setUser({
        id: session.user_id,
        full_name: session.full_name,
        username: session.username,
        facility_id: session.facility_id,
        type: JSON.stringify(session.kind),
      });
    });
  });
}
