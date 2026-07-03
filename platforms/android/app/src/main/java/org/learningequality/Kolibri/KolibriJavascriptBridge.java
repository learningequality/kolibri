package org.learningequality.Kolibri;

import android.app.Activity;
import android.content.Context;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.Keep;

public class KolibriJavascriptBridge {
  private static final String TAG = "KolibriJSBridge";

  private final Activity activity;
  private final WebView webView;

  public KolibriJavascriptBridge(Activity activity, WebView webView) {
    this.activity = activity;
    this.webView = webView;
  }

  @JavascriptInterface
  @Keep
  public void print() {
    activity.runOnUiThread(
        () -> {
          PrintManager printManager =
              (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
          if (printManager == null) {
            Log.w(TAG, "PrintManager unavailable");
            return;
          }
          String title = webView.getTitle();
          String jobName = title != null ? title : "Kolibri";
          PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
          printManager.print(jobName, adapter, null);
        });
  }
}
