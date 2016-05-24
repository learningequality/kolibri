
// include global styles
require('normalize.css');
require('./global.styl');

// set up logging
const logging = require('loglevel');
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// create an instance of the global app object
const CoreAppConstructor = require('./core_app_constructor');
module.exports = new CoreAppConstructor();
