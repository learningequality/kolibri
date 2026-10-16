import SandboxedContentViewer from './internal/SandboxedContentViewer.vue';
import setup from './internal/setup';

export { renderableFileTypes } from '../../composables/internal/renderableFileTypes';

/**
 * Factory function to create a SandboxedContentViewer with baked-in options.
 * @param {object} options - Configuration options
 * @param {boolean} [options.pollProgress=false] - Poll the sandbox for progress, falling
 * back to time spent over the content's duration when the content reports none
 * @param {Function|null} [options.urlBuilder=null] - Builds the content URL from the file
 * and `{ options, contentNode }`; see useSandbox
 * @param {Function|null} [options.onHandlerRequest=null] - Answers the handler's
 * requestFromHost calls; see useSandbox
 * @param {boolean} [options.renderFiles=false] - Render files the handler sends; see useSandbox
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
