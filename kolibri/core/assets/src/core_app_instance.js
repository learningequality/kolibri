
const logging = require('loglevel');
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

const CoreAppConstructor = require('./core_app_constructor');
module.exports = new CoreAppConstructor();
