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

/**
 * Detects if we are running inside an embedded web view.
 */
export function isEmbeddedWebView() {
  const ua = window.navigator.userAgent;
  const isMac = /Macintosh/.test(ua);
  let isEmbedded = false;

  // Embedded WebViews on Mac have no app identifier, while all the major browsers do, so check
  // for browser app strings and mark as embedded if none are found.
  // TODO: Simplify this by updating the embedded browser's user agent to add KolibriApp or similar.
  if (isMac) {
    isEmbedded = !(/Safari/.test(ua) || /Chrome/.test(ua) || /Firefox/.test(ua));
  }

  return isEmbedded || isAndroidWebView();
}

export const fullscreenApiIsSupported = ScreenFull.enabled && !isAndroidWebView();
