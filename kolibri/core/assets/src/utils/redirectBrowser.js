import urls from 'kolibri.urls';

export function redirectBrowser(url) {
  window.location.href = url || urls['kolibri:core:redirect_user']();
}
