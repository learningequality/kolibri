
const logging = require('loglevel');
logging.setDefaultLevel(2);

const CoreAppConstructor = require('./core_app_constructor');
module.exports = new CoreAppConstructor();
