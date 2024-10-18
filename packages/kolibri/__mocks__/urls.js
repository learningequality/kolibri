let returnedUrl = 'test';

const urlsObject = {
  __setUrl(url) {
    returnedUrl = url;
  },
};

const urls = new Proxy(urlsObject, {
  get(obj, prop) {
    if (obj[prop]) {
      return obj[prop];
    }
    return () => returnedUrl;
  },
});

export default urls;
