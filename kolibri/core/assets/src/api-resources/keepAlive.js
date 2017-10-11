const Resource = require('../api-resource').Resource;

/**
 * @example <caption>Get current session</caption>
 * SessionResource.getModel('current')
 */
class KeepAliveResource extends Resource {
  static resourceName() {
    return 'keepalive';
  }
}

module.exports = KeepAliveResource;
