/*
 * Vendored from https://github.com/Stuk/jszip-utils/blob/master/lib/index.js
 */

/**
 * @param  {string} path    The path to the resource to GET.
 * @return {Promise}
 */
export default function (path) {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new window.XMLHttpRequest();

      xhr.open('GET', path, true);

      xhr.responseType = 'arraybuffer';

      xhr.onreadystatechange = function () {
        // use `xhr` and not `this`... thanks IE
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0) {
            try {
              resolve(xhr.response);
            } catch (err) {
              reject(new Error(err));
            }
          } else {
            reject(new Error('Ajax error for ' + path + ' : ' + xhr.status + ' ' + xhr.statusText));
          }
        }
      };
      xhr.send();
    } catch (e) {
      reject(new Error(e), null);
    }
  });
}
