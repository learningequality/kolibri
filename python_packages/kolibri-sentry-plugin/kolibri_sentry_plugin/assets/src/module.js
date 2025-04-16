import * as Sentry from '@sentry/vue';
import kolibri from 'kolibri';
import plugin_data from 'kolibri-plugin-data';
import Vue from 'vue';
import store from 'kolibri/store';
import { currentLanguage } from 'kolibri/utils/i18n';

if (plugin_data.sentryDSN) {
  Sentry.init({
    Vue: Vue,
    dsn: plugin_data.sentryDSN,
    environment: plugin_data.sentryEnv,
    release: kolibri.version,
  });
  Sentry.setTag('lang', currentLanguage);
  Sentry.setTag('host', window.location.hostname);
  store.watch(
    state => state.error,
    errorString => {
      if (errorString) {
        Sentry.captureException(errorString);
      }
    },
  );
  store.watch(
    state => state.session,
    session => {
      Sentry.setUser({
        id: session.user_id,
        full_name: session.full_name,
        username: session.username,
        facility_id: session.facility_id,
        type: JSON.stringify(session.kind),
      });
    },
  );
}
