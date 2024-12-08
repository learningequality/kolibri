/*
 * Vendored and modified from https://github.com/Stuk/jszip-utils/blob/master/lib/index.js
 */

/**
 * Load binary data with support for HEAD requests and byte ranges
 * @param  {string} path    The path to the resource to GET
 * @param  {Object} options Request options
 * @param  {string} options.method HTTP method (GET/HEAD)
 * @param  {number} options.start Start byte for range request
 * @param  {number} options.end End byte for range request
 * @return {Promise<ArrayBuffer>}
 */
export default function loadBinary(path, options = {}) {
  const { method = 'GET', start, end } = options;

  return new Promise((resolve, reject) => {
    try {
      const xhr = new window.XMLHttpRequest();

      // Handle network errors - needs to be set before open()
      xhr.onerror = function () {
        reject(new Error('Error initiating request: Network error'));
      };

      xhr.open(method, path, true);

      // Only set responseType for GET requests
      // HEAD requests with responseType can fail in some browsers
      if (method === 'GET') {
        xhr.responseType = 'arraybuffer';
      }

      // Only add range header if both start and end are explicitly defined numbers
      if (typeof start === 'number' && typeof end === 'number' && !isNaN(start) && !isNaN(end)) {
        xhr.setRequestHeader('Range', `bytes=${start}-${end}`);
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        // Success states
        if (xhr.status === 200 || xhr.status === 206 || (method === 'HEAD' && xhr.status === 204)) {
          try {
            if (method === 'HEAD') {
              resolve({
                contentLength: parseInt(xhr.getResponseHeader('Content-Length')),
                acceptRanges: xhr.getResponseHeader('Accept-Ranges'),
              });
            } else {
              resolve(xhr.response);
            }
          } catch (err) {
            reject(new Error(`Error processing response: ${err.message}`));
          }
          return;
        }

        // Any other status including 0 is treated as an error
        if (xhr.status === 0) {
          reject(new Error('Error initiating request: Network error'));
        } else {
          reject(new Error(`HTTP error for ${path}: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.send();
    } catch (e) {
      reject(new Error(`Error initiating request: ${e.message}`));
    }
  });
}
