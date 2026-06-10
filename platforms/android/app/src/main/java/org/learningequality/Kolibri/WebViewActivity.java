package org.learningequality.Kolibri;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.drawable.AnimatedVectorDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.chaquo.python.Python;

/**
 * Main activity that displays Kolibri in a WebView using HTTP + Service Worker
 *
 * <p>Waits for the HTTP server, then calls Python to build an initialization URL with auth token.
 * Restores the user's last page via the saved path in SharedPreferences.
 */
public class WebViewActivity extends AppCompatActivity {
  private static final String TAG = "WebViewActivity";
  private static final int REQUEST_NOTIFICATION_PERMISSION = 1001;
  private static final String PREFS_NAME = "kolibri_webview";
  private static final String PREF_LAST_PATH = "last_path";
  private static final String LOOPBACK_IP = "127.0.0.1";
  private static final String LOCALHOST = "localhost";

  private WebView webView;
  private FrameLayout fullscreenContainer;
  private View splashContainer;
  private boolean shouldClearHistory;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_webview);

    applyEdgeToEdgeInsets();
    requestNotificationPermission();
    setupSplash();
    setupWebView();
    setupBackNavigation();
    loadKolibri();
  }

  @Override
  protected void onStart() {
    super.onStart();
    // Restart the server service if Android stopped it while the app was idle
    startService(new Intent(this, KolibriServerService.class));
  }

  /**
   * Apply system-bar + display-cutout insets as padding on the root container. Android 15+ (API
   * 35+) enforces edge-to-edge layout when targetSdk>=35, so without this the WebView and splash
   * draw under the status/nav bars and the yellow splash color bleeds into those zones.
   */
  private void applyEdgeToEdgeInsets() {
    View root = findViewById(R.id.root_container);
    ViewCompat.setOnApplyWindowInsetsListener(
        root,
        (v, windowInsets) -> {
          Insets insets =
              windowInsets.getInsets(
                  WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
          v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
          return WindowInsetsCompat.CONSUMED;
        });
  }

  /** Request POST_NOTIFICATIONS permission on Android 13+ */
  private void requestNotificationPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
          != PackageManager.PERMISSION_GRANTED) {
        Log.d(TAG, "Requesting POST_NOTIFICATIONS permission");
        ActivityCompat.requestPermissions(
            this,
            new String[] {Manifest.permission.POST_NOTIFICATIONS},
            REQUEST_NOTIFICATION_PERMISSION);
      }
    }
  }

  /** Start the animated splash screen and set version text. */
  private void setupSplash() {
    splashContainer = findViewById(R.id.splash_container);

    ImageView splashImage = findViewById(R.id.splash_image);
    Drawable drawable = splashImage.getDrawable();
    if (drawable instanceof AnimatedVectorDrawable) {
      ((AnimatedVectorDrawable) drawable).start();
    }

    TextView versionText = findViewById(R.id.version_text);
    versionText.setText(BuildConfig.VERSION_NAME);
  }

  /**
   * Setup back navigation using OnBackPressedCallback. Handles WebView history navigation before
   * exiting activity.
   */
  private void setupBackNavigation() {
    getOnBackPressedDispatcher()
        .addCallback(
            this,
            new OnBackPressedCallback(true) {
              @Override
              public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                  webView.goBack();
                } else {
                  // Disable this callback and trigger default back behavior
                  setEnabled(false);
                  getOnBackPressedDispatcher().onBackPressed();
                }
              }
            });
  }

  private void setupWebView() {
    if (BuildConfig.DEBUG) {
      WebView.setWebContentsDebuggingEnabled(true);
    }

    this.webView = findViewById(R.id.webview);
    fullscreenContainer = findViewById(R.id.fullscreen_container);
    WebSettings settings = webView.getSettings();

    // Enable cookies and ensure persistence
    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);
    cookieManager.setAcceptThirdPartyCookies(webView, false);

    // Enable DOM storage (localStorage/sessionStorage) for Kolibri web app
    settings.setDomStorageEnabled(true);
    settings.setJavaScriptEnabled(true);

    // Local HTTP server only — no mixed content needed
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

    // No file:// or content:// access needed — Kolibri loads via http://127.0.0.1
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);

    // Set WebChromeClient for fullscreen video
    webView.setWebChromeClient(new KolibriWebChromeClient(this, fullscreenContainer));

    // Open external URLs in the system browser, keep local URLs in the WebView
    webView.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String host = uri.getHost();
            if (LOOPBACK_IP.equals(host) || LOCALHOST.equals(host)) {
              return false;
            }
            try {
              Intent intent = new Intent(Intent.ACTION_VIEW, uri);
              startActivity(intent);
            } catch (ActivityNotFoundException e) {
              Log.e(TAG, "No activity found to handle URL: " + uri, e);
            }
            return true;
          }

          @Override
          public void onPageFinished(WebView view, String url) {
            if (shouldClearHistory) {
              view.clearHistory();
              shouldClearHistory = false;
            }
            // Hide splash when a real localhost page finishes loading
            if (url != null && !url.startsWith("data:")) {
              hideSplash();
            }
            saveLastPath(url);
          }
        });
  }

  private void loadKolibri() {
    Log.d(TAG, "Loading Kolibri");

    // Start server service
    Intent serverIntent = new Intent(this, KolibriServerService.class);
    startService(serverIntent);

    // Observe server readiness from singleton
    // Note: Using getInstance() not ViewModelProvider to ensure we observe
    // the same instance that Python updates via setServerReady()
    KolibriServerViewModel viewModel = KolibriServerViewModel.getInstance();

    viewModel
        .getServerReadyLiveData()
        .observe(
            this,
            ready -> {
              if (!ready) {
                return;
              }
              loadInitializeUrl();
            });
  }

  /** Build the initialization URL on a background thread (calls Python) and load it. */
  private void loadInitializeUrl() {
    // Read saved path to restore user's last page
    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
    String nextUrl = prefs.getString(PREF_LAST_PATH, null);
    Log.d(TAG, "Server ready, restoring path: " + nextUrl);

    new Thread(
            () -> {
              String url =
                  Python.getInstance()
                      .getModule("main")
                      .callAttr("get_initialize_url", nextUrl)
                      .toString();
              runOnUiThread(
                  () -> {
                    if (webView != null) {
                      shouldClearHistory = true;
                      webView.loadUrl(url);
                    }
                  });
            })
        .start();
  }

  /**
   * Save the last loaded path from a localhost URL for restoring on next launch. Skips
   * non-localhost URLs and data: URLs.
   */
  private void saveLastPath(String url) {
    if (url == null || url.startsWith("data:")) {
      return;
    }
    Uri uri = Uri.parse(url);
    if (!LOOPBACK_IP.equals(uri.getHost())) {
      return;
    }
    String origin = uri.getScheme() + "://" + uri.getAuthority();
    String path = url.substring(origin.length());
    getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putString(PREF_LAST_PATH, path).apply();
  }

  /** Hide the splash screen */
  private void hideSplash() {
    if (splashContainer != null && splashContainer.getVisibility() == View.VISIBLE) {
      splashContainer.setVisibility(View.GONE);
    }
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();

    // Destroy WebView
    if (webView != null) {
      webView.destroy();
      webView = null;
    }
  }
}
