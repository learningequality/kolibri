const Resource = require('../api-resource').Resource;

class SignUpResource extends Resource {
  static resourceName() {
    return 'signup';
  }
}

module.exports = SignUpResource;
