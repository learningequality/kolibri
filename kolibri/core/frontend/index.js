import './minimumBrowserRequirements';
import 'core-js';
import coreApp from 'kolibri';
import logging from 'kolibri-logging';
import store from 'kolibri/store';
import heartbeat from 'kolibri/heartbeat';
import { i18nSetup } from 'kolibri/utils/i18n';
import coreModule from './state/modules/core';

logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Removed old Vuex pageVisibility dispatch

store.registerModule('core', coreModule);

heartbeat.startPolling();

i18nSetup().then(coreApp.ready);

export default coreApp;
