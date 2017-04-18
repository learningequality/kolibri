const Resource = require('../api-resource').Resource;

/**
 * @example <caption>Get current session</caption>
 * SessionResource.getModel('current')
 */
class SessionResource extends Resource {
  static resourceName() {
    return 'session';
  }
}

module.exports = SessionResource;
