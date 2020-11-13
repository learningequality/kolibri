import store from 'kolibri.coreVue.vuex.store';
import { userAgent } from './browserInfo';

/**
 * Detection of whether an Android device is using WebView based on
 * https://developer.chrome.com/multidevice/user-agent#webview_user_agent
 * First checks for 'wv' (Lolipop+), then for 'Version/x.x'
 */
const isAndroid = /Android/.test(userAgent);
const isMac = /Macintosh/.test(userAgent);
const isWindows = /Windows/.test(userAgent);

/**
 * All web views
 * TODO: Refactor calling code to check isAppContext explicitly rather than
 * calling this method. (Or ideally switch to calling checkAppCapabilities
 * for the functionality we want to expose, including file download.)
 *
 * Note that we explicitly exclude Linux from this check because the GNOME
 * app currently does not set this.
 */
export const isEmbeddedWebView = function() {
  return (isAndroid || isMac || isWindows) && store.getters.isAppContext;
};

/**
 * CoreFullscreen checks for embedded Android specifically
 * TODO: See if we can enable fullscreen on embedded Android
 */
export const isAndroidWebView = function() {
  return isAndroid && isEmbeddedWebView;
};
