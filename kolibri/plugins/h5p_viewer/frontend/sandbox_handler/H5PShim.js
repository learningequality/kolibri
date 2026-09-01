/**
 * H5P shim.
 *
 * Defines the H5PIntegration global that the H5P vendor bundle reads to
 * configure itself. This has to be a shim rather than something the runner
 * sets up after loading the content: the vendor bundle reads H5PIntegration on
 * document ready, which fires long before the H5P zip has been processed.
 */
import SandboxShim from 'kolibri-sandbox/SandboxShim';

/**
 * @typedef {import('./H5PRunner').default} H5PRunner
 */

export default class H5PShim extends SandboxShim {
  static shimName = 'H5P';

  // The runner reads the learner's name out of user data, for the xAPI actor H5P
  // puts on every statement it sends.
  static consumesUserData = true;

  /**
   * Wire up the runner that resolves the integration object.
   * @param {H5PRunner} runner - Runner that builds the integration object
   */
  setRunner(runner) {
    this.runner = runner;
  }

  /**
   * Define H5PIntegration as an accessor rather than a value, so installing it
   * does not depend on the runner already existing - it only has to be wired up
   * by the time H5P reads the property, which is strictly later.
   * @param {Window} contentWindow - Window object to define H5PIntegration on
   */
  iframeInitialize(contentWindow) {
    const self = this;
    Object.defineProperty(contentWindow, 'H5PIntegration', {
      get() {
        return self.runner.buildIntegration();
      },
      configurable: true,
    });
  }
}
