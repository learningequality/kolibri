function getUrl(url) {
  const newUrl = url.split('/blob')[1];
  if (newUrl) return `blob${newUrl}`;
  return url;
}

function interceptRequests() {
  XMLHttpRequest.prototype.origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    if (args[1].endsWith('.htm')) {
      args[1] = localStorage.getItem('content_url');
      localStorage.removeItem('content_url');
    } else if (args[1].endsWith('.distribution')) {
      args[1] = localStorage.getItem('distribution_url');
      localStorage.removeItem('distribution_url');
    } else if (args[1].endsWith('meta.json')) {
      args[1] = localStorage.getItem('meta_url');
      localStorage.removeItem('meta_url');
    } else {
      args[1] = getUrl(args[1]);
    }

    return this.origOpen.apply(this, args);
  };
}

interceptRequests();
