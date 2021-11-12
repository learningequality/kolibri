import urls from 'kolibri.urls';

export default function redirectBrowser(url) {
  window.location.href = url || urls['kolibri:core:redirect_user']();
}
