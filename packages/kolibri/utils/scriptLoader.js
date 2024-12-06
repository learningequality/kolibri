/**
 * Loads a Javascript file and executes it.
 * @param  {String} url URL for the script
 * @return {Promise}     Promise that resolves when the script has loaded
 */
export default function scriptLoader(url) {
  return new Promise((resolve, reject) => {
    let script;
    if (url.endsWith('js')) {
      script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.async = true;
      script.addEventListener('load', () => resolve(script));
      script.addEventListener('error', reject);
    } else if (url.endsWith('css')) {
      script = document.createElement('link');
      script.rel = 'stylesheet';
      script.type = 'text/css';
      script.href = url;
      // Can't detect loading for css, so just assume it worked.
      resolve(script);
    } else {
      return resolve();
    }
    global.document.body.appendChild(script);
  });
}
