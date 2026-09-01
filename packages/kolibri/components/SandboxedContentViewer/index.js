import SandboxedContentViewer from './internal/SandboxedContentViewer.vue';
import setup from './internal/setup';

/**
 * Factory function to create a SandboxedContentViewer with baked-in options.
 * @param {object} options - Configuration options
 * @param {number|null} [options.defaultDuration=null] - Default duration for time-based progress
 * @param {number|null} [options.progressPollingInterval=null] - Interval in ms to poll progress
 * @param {Function|null} [options.urlBuilder=null] - Custom function to build content URL
 * @param {object} [options.eventHandlers={}] - Additional sandbox event handlers
 * @returns {object} Vue component definition
 */
export function createSandboxedContentViewer(options = {}) {
  return {
    extends: SandboxedContentViewer,
    setup(props, context) {
      return setup(props, context, options);
    },
  };
}

export default SandboxedContentViewer;
