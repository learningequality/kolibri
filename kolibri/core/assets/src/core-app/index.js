// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
import 'core-js';
// Required to setup Keen UI, should be imported only once in your project
import 'keen-ui/src/bootstrap';
import '../keen-config/font-stack.scss';
import '../styles/main.scss';
import urls from 'kolibri.urls';
import * as theme from 'kolibri-components/src/styles/theme';
import generateGlobalStyles from 'kolibri-components/src/styles/generateGlobalStyles';
import trackInputModality from 'kolibri-components/src/styles/trackInputModality';
import keenUiConfig from 'keen-ui/src/config';
import branding from 'kolibri.utils.branding';
import logging from 'kolibri.lib.logging';
import keenOptions from '../keen-config/options.json';
import CoreAppConstructor from './constructor';
import monitorPageVisibility from './monitorPageVisibility';
import getPluginData from 'kolibri.utils.getPluginData';
// Do this before any async imports to ensure that public paths
// are set correctly
urls.setUp();

// set up logging
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// set up theme
const kolibriTheme = getPluginData().kolibriTheme;

theme.setBrandColors(kolibriTheme.brandColors);
theme.setTokenMapping(kolibriTheme.tokenMapping);
// set up branding
branding.setBranding(kolibriTheme);

// configure Keen
keenUiConfig.set(keenOptions);

// global styles
generateGlobalStyles();

// monitor input modality
trackInputModality();

// monitor page visibility
monitorPageVisibility();

// Create an instance of the global app object.
// This is exported by webpack as the kolibriCoreAppGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
const coreApp = new CoreAppConstructor();

export default coreApp;
