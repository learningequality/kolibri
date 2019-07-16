import Sentry from '@sentry/browser';
import SentryIntegrations from '@sentry/integrations';
import kolibri from 'kolibri';
import Vue from 'kolibri.lib.vue';
import logger from 'kolibri.lib.logging';
import { currentLanguage } from 'kolibri.utils.i18n';

const logging = logger.getLogger(__filename);

const context = global[__kolibriModuleName] || {};

if (context.sentryDSN) {
  Sentry.init({
    dsn: context.sentryDSN,
    environment: context.sentryEnv,
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
}
