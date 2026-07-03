package org.learningequality.Kolibri;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.drawable.AnimatedVectorDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.chaquo.python.Python;
import java.util.Arrays;
import org.json.JSONObject;

/**
 * Main activity that displays Kolibri in a WebView using HTTP + Service Worker
 *
 * <p>Waits for the HTTP server, then calls Python to build an initialization URL with auth token.
 * Restores the user's last page via the saved path in SharedPreferences.
 */
public class WebViewActivity extends AppCompatActivity {
  private static final String TAG = "WebViewActivity";
  private static final int REQUEST_NOTIFICATION_PERMISSION = 1001;
  private static final int REQUEST_STORAGE_PERMISSION = 1002;
  private static final String PREFS_NAME = "kolibri_webview";
  private static final String PREF_LAST_PATH = "last_path";
  private static final String LOOPBACK_IP = "127.0.0.1";
  private static final String LOCALHOST = "localhost";

  private WebView webView;
  private KolibriJavascriptBridge bridge;
  private FrameLayout fullscreenContainer;
  private View splashContainer;
  private boolean shouldClearHistory;
  private ValueCallback<Uri[]> pendingFilePickerCallback;
  private ActivityResultLauncher<String[]> filePickerLauncher;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_webview);

    applyEdgeToEdgeInsets();
    requestNotificationPermission();
    requestLegacyStoragePermission();
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

  /**
   * Request WRITE_EXTERNAL_STORAGE on API 24-28, needed for downloads below MediaStore's API 29
   * floor.
   */
  private void requestLegacyStoragePermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
        && ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
            != PackageManager.PERMISSION_GRANTED) {
      Log.d(TAG, "Requesting WRITE_EXTERNAL_STORAGE permission");
      ActivityCompat.requestPermissions(
          this,
          new String[] {Manifest.permission.WRITE_EXTERNAL_STORAGE},
          REQUEST_STORAGE_PERMISSION);
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
    filePickerLauncher =
        registerForActivityResult(
            new ActivityResultContracts.OpenDocument(),
            uri -> {
              ValueCallback<Uri[]> callback = pendingFilePickerCallback;
              pendingFilePickerCallback = null;
              if (callback != null) {
                callback.onReceiveValue(uri != null ? new Uri[] {uri} : null);
              }
            });

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

    webView.setWebChromeClient(
        new KolibriWebChromeClient(this, fullscreenContainer) {
          @Override
          public boolean onShowFileChooser(
              WebView wv, ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
            if (pendingFilePickerCallback != null) {
              pendingFilePickerCallback.onReceiveValue(null);
            }
            pendingFilePickerCallback = callback;
            String[] accepted = params.getAcceptTypes();
            String[] mimeTypes =
                Arrays.stream(accepted != null ? accepted : new String[0])
                    .filter(t -> t != null && !t.isEmpty())
                    .toArray(String[]::new);
            filePickerLauncher.launch(mimeTypes.length == 0 ? new String[] {"*/*"} : mimeTypes);
            return true;
          }
        });

    bridge = new KolibriJavascriptBridge(this, webView);
    webView.addJavascriptInterface(bridge, "Kolibri");

    webView.setWebViewClient(
        new WebViewClient() {
          @Override
          public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            // DownloadListener isn't passed the triggering <a download> attribute, so capture it
            // here — otherwise blob: downloads fall back to a UUID filename guessed from the URL.
            view.evaluateJavascript(
                "window.print = () => window.Kolibri.print();"
                    + "if (!window.__kolibriDownloadNameHook) {"
                    + "window.__kolibriDownloadNameHook = true;"
                    + "document.addEventListener('click', function(e) {"
                    + "var a = e.target.closest && e.target.closest('a[download]');"
                    + "if (a) { window.Kolibri.notePendingDownloadName(a.getAttribute('download')); }"
                    + "}, true);"
                    + "}",
                null);
          }

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

    webView.setDownloadListener(this::handleDownload);
  }

  private void handleDownload(
      String url,
      String userAgent,
      String contentDisposition,
      String mimetype,
      long contentLength) {
    Uri uri = Uri.parse(url);
    String scheme = uri.getScheme();
    String filename = resolveFilename(url, contentDisposition, mimetype);
    if ("blob".equals(scheme) || "data".equals(scheme)) {
      saveBlobDownload(url, filename, mimetype);
      return;
    }
    if (!"http".equals(scheme) && !"https".equals(scheme)) {
      Log.w(TAG, "Unsupported download scheme, skipping: " + url);
      return;
    }
    String cookie = CookieManager.getInstance().getCookie(url);
    new Thread(() -> bridge.downloadHttp(url, userAgent, cookie, filename, mimetype)).start();
  }

  /**
   * Prefers the filename captured from the triggering {@code <a download>} click — the
   * DownloadListener callback isn't passed it, and for blob: URLs {@link URLUtil#guessFileName}
   * falls back to the blob URL's UUID.
   */
  private String resolveFilename(String url, String contentDisposition, String mimetype) {
    String pending = bridge.consumePendingDownloadFilename();
    if (pending != null && !pending.isEmpty()) {
      return pending;
    }
    return URLUtil.guessFileName(url, contentDisposition, mimetype);
  }

  /**
   * blob:/data: URLs only exist in the renderer's memory, so they can't be fetched from native code
   * directly. Fetch and base64-encode the content in JS, then hand it to the native bridge to write
   * out — the same MediaStore-backed path used for http(s) downloads.
   */
  private void saveBlobDownload(String url, String filename, String mimetype) {
    String quotedFilename = JSONObject.quote(filename);
    String script =
        "fetch("
            + JSONObject.quote(url)
            + ").then(function(r) { return r.blob(); }).then(function(blob) {"
            + "var reader = new FileReader();"
            + "reader.onload = function() {"
            + "var result = reader.result;"
            + "var base64 = result.substring(result.indexOf(',') + 1);"
            + "Kolibri.saveBlob(base64, "
            + quotedFilename
            + ", blob.type || "
            + JSONObject.quote(mimetype)
            + ");"
            + "};"
            + "reader.onerror = function() { Kolibri.notifyBlobDownloadFailed("
            + quotedFilename
            + "); };"
            + "reader.readAsDataURL(blob);"
            + "}).catch(function() { Kolibri.notifyBlobDownloadFailed("
            + quotedFilename
            + "); });";
    webView.evaluateJavascript(script, null);
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
