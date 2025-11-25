import * as Sentry from '@sentry/vue';
import kolibri from 'kolibri';
import plugin_data from 'kolibri-plugin-data';
import Vue, { watch } from 'vue';
import store from 'kolibri/store';
import useUser from 'kolibri/composables/useUser';
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

  // Use the useUser composable to track user changes
  const user = useUser();

  // Watch for changes to the current user and update Sentry scope
  watch(
    () => user.currentUserId.value,
    () => {
      if (user.isUserLoggedIn.value) {
        Sentry.setUser({
          id: user.currentUserId.value,
          full_name: user.full_name.value,
          username: user.username.value,
          facility_id: user.userFacilityId.value,
          type: JSON.stringify(user.kind.value),
        });
      } else {
        Sentry.setUser(null);
      }
    },
    { immediate: true },
  );
}
