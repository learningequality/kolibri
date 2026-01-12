/**
 * Utilities for loading handlers in the sandbox environment.
 */

/**
 * @typedef {import('./iframeClient').default} SandboxEnvironment
 */

/**
 * Load a handler script from a URL and wait for it to register.
 * @param {string} url - URL to the handler script
 * @param {SandboxEnvironment} sandbox - The sandbox environment the handler registers into
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export function loadHandler(url, sandbox, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;

    // Release the script tag and resolver on every terminal path, so
    // re-invoking loadHandler on content navigation doesn't leak either.
    const cleanup = () => {
      clearTimeout(timeoutId);
      sandbox._handlerRegistrationResolver = null;
      script.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Handler registration timeout after ${timeout}ms`));
    }, timeout);

    // Store resolver so registerHandler can call it
    sandbox._handlerRegistrationResolver = () => {
      cleanup();
      resolve();
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load handler script: ${url}`));
    };
    document.head.appendChild(script);
  });
}

export default { loadHandler };
