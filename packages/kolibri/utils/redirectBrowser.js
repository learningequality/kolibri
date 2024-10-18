import urls from 'kolibri/urls';

export default function redirectBrowser(url, next = false) {
  url = url || urls['kolibri:core:redirect_user']();
  const urlObject = new URL(url, window.location.origin);
  if (next) {
    urlObject.searchParams.set('next', encodeURIComponent(window.location.href));
  }
  window.location.href = urlObject.href;
}
