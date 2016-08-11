const Resource = require('../api-resource').Resource;

class SessionResource extends Resource {
  static resourceName() {
    return 'session';
  }
}

module.exports = SessionResource;
