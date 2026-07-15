package org.learningequality.Kolibri;

import android.app.Activity;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;

/** Custom WebChromeClient that handles fullscreen video playback */
public class KolibriWebChromeClient extends WebChromeClient {
  private static final String TAG = "Kolibri.WebChromeClient";

  private final Activity activity;
  private final FrameLayout fullscreenContainer;
  private View customView;
  private CustomViewCallback customViewCallback;

  public KolibriWebChromeClient(Activity activity, FrameLayout fullscreenContainer) {
    this.activity = activity;
    this.fullscreenContainer = fullscreenContainer;
  }

  @Override
  public void onShowCustomView(View view, CustomViewCallback callback) {
    // If a view already exists, hide it
    if (customView != null) {
      onHideCustomView();
      return;
    }

    // Store the custom view and callback
    customView = view;
    customViewCallback = callback;

    // Hide system UI for immersive fullscreen
    hideSystemUI();

    // Add the custom view to the fullscreen container
    fullscreenContainer.addView(customView);
    fullscreenContainer.setVisibility(View.VISIBLE);
  }

  @Override
  public void onHideCustomView() {
    // Remove the custom view
    if (customView != null) {
      fullscreenContainer.removeView(customView);
      customView = null;
    }

    // Hide the fullscreen container
    fullscreenContainer.setVisibility(View.GONE);

    // Restore system UI
    showSystemUI();

    // Notify the callback
    if (customViewCallback != null) {
      customViewCallback.onCustomViewHidden();
      customViewCallback = null;
    }
  }

  private void hideSystemUI() {
    Window window = activity.getWindow();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController controller = window.getInsetsController();
      if (controller != null) {
        controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        controller.setSystemBarsBehavior(
            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
      }
    } else {
      @SuppressWarnings("deprecation")
      int flags =
          View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
      window.getDecorView().setSystemUiVisibility(flags);
    }
  }

  private void showSystemUI() {
    Window window = activity.getWindow();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController controller = window.getInsetsController();
      if (controller != null) {
        controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
      }
    } else {
      @SuppressWarnings("deprecation")
      int flags = View.SYSTEM_UI_FLAG_VISIBLE;
      window.getDecorView().setSystemUiVisibility(flags);
    }
  }
}
