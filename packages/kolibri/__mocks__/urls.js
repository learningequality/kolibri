let resolveUrl = () => 'test';

const urlsObject = {
  __setUrl(url) {
    resolveUrl = () => url;
  },
  // The default collapses every route to one URL, hiding a wrong action name or route parameter.
  __echoUrls() {
    resolveUrl = (name, ...args) => `/${[name, ...args].join('/')}`;
  },
};

const urls = new Proxy(urlsObject, {
  get(obj, prop) {
    if (obj[prop]) {
      return obj[prop];
    }
    return (...args) => resolveUrl(String(prop), ...args);
  },
});

export default urls;
