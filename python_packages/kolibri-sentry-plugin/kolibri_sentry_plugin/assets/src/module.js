import * as Sentry from '@sentry/vue';
import kolibri from 'kolibri';
import plugin_data from 'kolibri-plugin-data';
import Vue from 'vue';
import store from 'kolibri/store';
import { currentLanguage } from 'kolibri/utils/i18n';

if (plugin_data.sentryDSN) {
  const initOptions = {
    Vue: Vue,
    dsn: plugin_data.sentryDSN,
    environment: plugin_data.sentryEnv,
    release: kolibri.version,
    integrations: [],
  };
  if (plugin_data.sentryReplayEnabled) {
    // By default record 10% of all sessions
    initOptions.replaysSessionSampleRate = 0.1;
    // Record 100% of all error sessions
    initOptions.replaysOnErrorSampleRate = 1.0;
    initOptions.integrations.push(
      Sentry.replayIntegration({
        // Kolibri collects and contains minimal PII, so we don't mask anything here.
        maskAllText: false,
        maskAllInputs: false,
        blockAllMedia: false,
      }),
    );
  }
  Sentry.init(initOptions);
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
