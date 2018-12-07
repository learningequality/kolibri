import ScreenFull from 'screenfull';
import urls from 'kolibri.urls';

export function redirectBrowser(url) {
  window.location.href = url || urls['kolibri:core:redirect_user']();
}

/**
 * Detects whether an Android device is using WebView.
 * Based on https://developer.chrome.com/multidevice/user-agent#webview_user_agent
 */
export function isAndroidWebView() {
  const ua = window.navigator.userAgent;
  const isAndroid = /Android/.test(ua);

  // First checks for 'wv' (Lolipop+), then for 'Version/x.x' (as specified in link above )
  const isWebview = /wv/.test(ua) || /Version\/\d+\.\d+/.test(ua);

  return isAndroid && isWebview;
}

export const fullscreenApiIsSupported = ScreenFull.enabled && !isAndroidWebView();
