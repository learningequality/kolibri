
// include global styles
require('purecss/build/base-min.css');
require('purecss/build/grids-min.css');
require('../styles/font-NotoSans.css');
require('../styles/main.styl');

// Required to setup Keen UI, should be imported only once in your project
require('keen-ui/src/bootstrap');

// configure Keen
import { default as KeenUiConfig } from 'keen-ui/src/config';
KeenUiConfig.set(require('../keen-config/options.json'));


// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');

// set up logging
import logging from 'kolibri.lib.logging';

logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Create an instance of the global app object.
// This is exported by webpack as the kolibriGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
//
// This is achieved by setting the `src_file` attribute in the core
// kolibri_plugin.py which tells the webpack build scripts to set the export of this file
// to a global variable.
import CoreAppConstructor from './constructor';

const coreApp = new CoreAppConstructor();

export { coreApp as default };
