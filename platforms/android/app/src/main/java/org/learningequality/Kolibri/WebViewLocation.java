package org.learningequality.Kolibri;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

/**
 * Where the WebView last was: the path to restore on a cold start, and the port the live page is
 * loaded on so a restarted server can come back on it.
 */
final class WebViewLocation {
  private static final String LOOPBACK_IP = "127.0.0.1";
  private static final String PREFS_NAME = "kolibri_webview";
  private static final String PREF_LAST_PATH = "last_path";

  /** Not persisted: a cold start must still elect an ephemeral port. */
  private static volatile int lastPort;

  private static volatile String initializePath;

  private WebViewLocation() {}

  /**
   * Makes {@link #save} skip the initialize URL: it 302s straight to the real page, and saving it
   * would nest a spent auth_token and a stale next inside the next one.
   */
  static void noteInitializeUrl(String url) {
    initializePath = Uri.parse(url).getPath();
  }

  /**
   * Record a URL as the page to come back to. Skips anything that is not a page served by our own
   * loopback server.
   *
   * <p>Main-frame URLs only: a {@code zipcontent} subframe URL passes the loopback host check but
   * carries the ZIP server's port, which would then be tried as the main server port.
   */
  static void save(Context context, String url) {
    if (url == null) {
      return;
    }
    Uri uri = Uri.parse(url);
    int port = uri.getPort();
    String origin = origin(uri);
    if (!LOOPBACK_IP.equals(uri.getHost()) || port <= 0 || origin == null) {
      return;
    }
    if (initializePath != null && initializePath.equals(uri.getPath())) {
      return;
    }
    // substring, not getPath(), so the query and fragment survive intact
    String path = url.substring(origin.length());
    lastPort = port;
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    // Called on every navigation, and onStop blocks on each queued apply().
    if (!path.equals(prefs.getString(PREF_LAST_PATH, null))) {
      prefs.edit().putString(PREF_LAST_PATH, path).apply();
    }
  }

  /** The path, query and fragment of the last page loaded, or {@code null}. */
  static String getLastPath(Context context) {
    return context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(PREF_LAST_PATH, null);
  }

  /** {@code location} up to its first {@code #}, which is as much of it as the server can route. */
  static String withoutFragment(String location) {
    if (location == null) {
      return null;
    }
    // indexOf, not Uri, to match how save built the string
    int hash = location.indexOf('#');
    return hash < 0 ? location : location.substring(0, hash);
  }

  /**
   * The URL to put {@code savedLocation}'s fragment back on now that {@code loadedUrl} has loaded,
   * or {@code null} when it does not belong there.
   *
   * <p>The fragment is restored here rather than sent to the server in {@code next}: a browser
   * carries the request URL's fragment onto a redirect whose {@code Location} has none. The sign-in
   * route saved at sign-out would otherwise ride the next launch's re-login redirect onto the page
   * that role gets, where it matches no route (#15232).
   */
  static String restoreUrlFor(String loadedUrl, String savedLocation) {
    if (loadedUrl == null || savedLocation == null || savedLocation.indexOf('#') < 0) {
      return null;
    }
    String origin = origin(Uri.parse(loadedUrl));
    if (origin == null) {
      return null;
    }
    if (!withoutFragment(loadedUrl).equals(origin + withoutFragment(savedLocation))) {
      return null;
    }
    String restoreUrl = origin + savedLocation;
    // The landed page's router may have set the saved route itself: loading it again is a
    // navigation to the current URL, not a hash change.
    return restoreUrl.equals(loadedUrl) ? null : restoreUrl;
  }

  /** The port the live page is loaded on, or {@code 0} if this process has not loaded one yet. */
  static int getLastPort() {
    return lastPort;
  }

  /** Whether two URLs share a scheme and authority. False if either lacks one. */
  static boolean isSameOrigin(String url, String otherUrl) {
    if (url == null || otherUrl == null) {
      return false;
    }
    String origin = origin(Uri.parse(url));
    return origin != null && origin.equals(origin(Uri.parse(otherUrl)));
  }

  private static String origin(Uri uri) {
    if (uri.getScheme() == null || uri.getAuthority() == null) {
      return null;
    }
    return uri.getScheme() + "://" + uri.getAuthority();
  }
}
