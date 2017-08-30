export function redirectBrowser(url) {
  window.location.href = url || window.location.origin;
}

/**
  * Detects whether an Android device is using WebView.
  * Based on https://developer.chrome.com/multidevice/user-agent#webview_user_agent
  */
export function isAndroidWebView() {
  const ua = window.navigator.userAgent;
  const isAndroid = /Android/.test(ua);

  if (isAndroid) {
    const androidVersion = parseFloat(ua.match(/Android\s([0-9\.]*)/)[1]);
    const isChrome = /Chrome/.test(ua);

    // WebView UA in Lollipop and Above
    // Android >=5.0
    if (androidVersion >= 5.0 && isChrome && /wv/.test(ua)) {
      return true;
    }

    // WebView UA in KitKat to Lollipop
    // Android >= 4.4
    if (androidVersion >= 4.4 && androidVersion < 5.0 && isChrome && /Version\//.test(ua)) {
      return true;
    }

    // Old WebView UA
    // Android < 4.4
    if (androidVersion < 4.4 && /Version\//.test(ua) && /\/534.30/.test(ua)) {
      return true;
    }
  }

  return false;
}
