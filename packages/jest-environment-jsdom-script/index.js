const JSDOMEnvironment = require('jest-environment-jsdom');

class JSDOMScriptEnvironment extends JSDOMEnvironment {
  constructor(config) {
    config = Object.assign({}, config, {
      testEnvironmentOptions: {
        resources: 'usable',
      },
    });
    super(config);
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = JSDOMScriptEnvironment;
