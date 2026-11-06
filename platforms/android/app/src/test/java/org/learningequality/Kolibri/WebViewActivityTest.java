package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.robolectric.Shadows.shadowOf;

import android.content.res.Configuration;
import android.graphics.Rect;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implementation;
import org.robolectric.annotation.Implements;
import org.robolectric.shadows.ShadowWebView;
import org.robolectric.util.ReflectionHelpers;
import org.robolectric.util.ReflectionHelpers.ClassParameter;

/**
 * {@code loadIfOriginChanged} is the seam — the observer reaches it through Chaquopy, which has no
 * JVM implementation, so the tests call it with the URL Python would have returned.
 */
@RunWith(RobolectricTestRunner.class)
@Config(shadows = WebViewActivityTest.FreezeTrackingWebView.class)
public class WebViewActivityTest {
  private static final String ORIGIN = "http://127.0.0.1:46655";
  private static final String PAGE_PATH = "/en/facility/#/data/import";
  private static final String PAGE_URL = ORIGIN + PAGE_PATH;

  /** PAGE_PATH's page as the server serves it: {@code next} carries only the path. */
  private static final String FACILITY_PATH = "/en/facility/";

  private static final String FACILITY_URL = ORIGIN + FACILITY_PATH;
  private static final String AUTH_PATH = "/en/auth/#/signin";
  private static final String AUTH_URL = ORIGIN + AUTH_PATH;
  private static final String DEVICE_PATH = "/en/device/";
  private static final String DEVICE_URL = ORIGIN + DEVICE_PATH;
  private static final String RESTORE_GUARD = "if (location.href !== ";
  private static final String SAME_ORIGIN_INITIALIZE_URL =
      ORIGIN + "/api/device/initialize/abc?auth_token=t";
  private static final String NEW_ORIGIN_INITIALIZE_URL =
      "http://127.0.0.1:45791/api/device/initialize/abc?auth_token=t";

  private ActivityController<WebViewActivity> controller;
  private WebView webView;
  private FreezeTrackingWebView shadowWebView;

  @Before
  public void setUp() {
    controller = Robolectric.buildActivity(WebViewActivity.class).setup();
    webView = controller.get().findViewById(R.id.webview);
    shadowWebView = (FreezeTrackingWebView) shadowOf(webView);
  }

  @After
  public void tearDown() {
    controller.close();
    // The singleton is shared across test methods in a Robolectric sandbox, and it posts its
    // value, so the reset only lands once the main looper runs.
    KolibriServerViewModel.getInstance().resetServerState();
    shadowOf(Looper.getMainLooper()).idle();
  }

  @Test
  public void theFirstPageLeavesBackToTheSystem() {
    serverComesUp();
    reachAPage(PAGE_URL);

    assertFalse(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
  }

  @Test
  public void backWalksHashHistoryAndThenLeavesBackToTheSystem() {
    serverComesUp();
    reachAPage(FACILITY_URL);
    visitRoute(FACILITY_URL);
    visitRoute(PAGE_URL);
    assertTrue(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());

    controller.get().getOnBackPressedDispatcher().onBackPressed();

    assertEquals(FACILITY_URL, webView.getUrl());
    webView.getWebViewClient().doUpdateVisitedHistory(webView, FACILITY_URL, false);
    assertFalse(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());

    visitRoute(PAGE_URL);

    assertTrue(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
    controller.get().getOnBackPressedDispatcher().onBackPressed();
    assertEquals(FACILITY_URL, webView.getUrl());
  }

  @Test
  public void historyNavigationStillWorksAfterReturningFromTheBackground() {
    serverComesUp();
    reachAPage(FACILITY_URL);
    visitRoute(FACILITY_URL);
    assertFalse(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());

    controller.pause().stop().start().resume();
    visitRoute(PAGE_URL);

    assertTrue(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
    controller.get().getOnBackPressedDispatcher().onBackPressed();
    assertEquals(FACILITY_URL, webView.getUrl());
  }

  @Test
  public void pageFinishedEnablesBackWhenHistoryArrivesAfterTheVisitedHistoryCallback() {
    serverComesUp();
    reachAPage(FACILITY_URL);
    visitRoute(FACILITY_URL);
    WebViewClient client = webView.getWebViewClient();
    client.doUpdateVisitedHistory(webView, PAGE_URL, false);
    assertFalse(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
    shadowWebView.pushEntryToHistory(PAGE_URL);

    client.onPageFinished(webView, PAGE_URL);

    assertTrue(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
    controller.get().getOnBackPressedDispatcher().onBackPressed();
    assertEquals(FACILITY_URL, webView.getUrl());
  }

  @Test
  public void aNewOriginClearsBackHistory() {
    serverComesUp();
    reachAPage(FACILITY_URL);
    visitRoute(FACILITY_URL);
    visitRoute(PAGE_URL);
    assertTrue(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());

    controller.get().loadIfOriginChanged(NEW_ORIGIN_INITIALIZE_URL, PAGE_PATH);
    reachAPage("http://127.0.0.1:45791" + PAGE_PATH);

    assertFalse(webView.canGoBack());
    assertFalse(controller.get().getOnBackPressedDispatcher().hasEnabledCallbacks());
  }

  @Test
  public void systemBarsAndCutoutKeepThePageAndSplashClear() {
    View root = controller.get().findViewById(R.id.root_container);
    WindowInsetsCompat insets =
        new WindowInsetsCompat.Builder()
            .setInsets(WindowInsetsCompat.Type.statusBars(), Insets.of(0, 63, 0, 0))
            .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 48))
            .setInsets(WindowInsetsCompat.Type.displayCutout(), Insets.of(80, 0, 0, 0))
            .build();

    ViewCompat.dispatchApplyWindowInsets(root, insets);

    assertEquals(80, root.getPaddingLeft());
    assertEquals(63, root.getPaddingTop());
    assertEquals(0, root.getPaddingRight());
    assertEquals(48, root.getPaddingBottom());
  }

  @Test
  public void theKeyboardKeepsThePageClearAndClosingItRestoresNavigationBarPadding() {
    View root = controller.get().findViewById(R.id.root_container);
    WindowInsetsCompat bars =
        new WindowInsetsCompat.Builder()
            .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 48))
            .build();
    WindowInsetsCompat keyboard =
        new WindowInsetsCompat.Builder(bars)
            .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 900))
            .build();

    ViewCompat.dispatchApplyWindowInsets(root, keyboard);

    assertEquals(900, root.getPaddingBottom());

    ViewCompat.dispatchApplyWindowInsets(root, bars);

    assertEquals(48, root.getPaddingBottom());
  }

  @Test
  @Config(sdk = 26)
  public void aResizedAndroid8WindowDoesNotReserveTheKeyboardHeightAgain() {
    View root = controller.get().findViewById(R.id.root_container);
    assertTrue(root.isAttachedToWindow());
    Object attachInfo = ReflectionHelpers.getField(root, "mAttachInfo");
    Rect visibleInsets = ReflectionHelpers.getField(attachInfo, "mVisibleInsets");
    visibleInsets.set(0, 63, 0, 900);
    WindowInsets consumed =
        ReflectionHelpers.callConstructor(
                WindowInsets.class, ClassParameter.from(Rect.class, new Rect(0, 63, 0, 900)))
            .consumeSystemWindowInsets();
    WindowInsetsCompat insets = WindowInsetsCompat.toWindowInsetsCompat(consumed, root);
    assertEquals(900, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom);
    assertEquals(0, insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom);

    root.dispatchApplyWindowInsets(consumed);

    assertEquals(0, root.getPaddingBottom());
  }

  @Test
  public void aPageSurvivesRotatingToATabletSizedWindow() {
    serverComesUp();
    reachAPage(PAGE_URL);
    WebViewActivity activity = controller.get();
    Configuration tablet = new Configuration(activity.getResources().getConfiguration());
    tablet.orientation = Configuration.ORIENTATION_LANDSCAPE;
    tablet.screenWidthDp = 1280;
    tablet.screenHeightDp = 800;
    tablet.smallestScreenWidthDp = 800;
    tablet.screenLayout =
        (tablet.screenLayout & ~Configuration.SCREENLAYOUT_SIZE_MASK)
            | Configuration.SCREENLAYOUT_SIZE_XLARGE;

    controller.configurationChange(tablet);

    assertSame(activity, controller.get());
    assertSame(webView, controller.get().findViewById(R.id.webview));
    assertEquals(PAGE_URL, webView.getUrl());
  }

  @Test
  public void aPageSurvivesTheServerBeingStoppedAndComingBackOnItsPort() {
    serverComesUp();
    // Cold start: no page to keep, so the initialize URL is loaded.
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, null);
    assertEquals(SAME_ORIGIN_INITIALIZE_URL, shadowWebView.getLastLoadedUrl());
    reachAPage(PAGE_URL);
    // That URL 302s to the page, so restoring it would nest a spent token in the next one.
    webView.getWebViewClient().doUpdateVisitedHistory(webView, SAME_ORIGIN_INITIALIZE_URL, false);
    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(controller.get()));

    serverIsStoppedWhileTheAppIsAway();
    assertFrozen();

    // Back in the foreground before the server has restarted: nothing may be issued yet.
    controller.start();
    assertFrozen();

    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    assertRunning();
    assertEquals(PAGE_URL, shadowWebView.getLastLoadedUrl());
  }

  /** The common case — the idle stop fires at ~60s, so a shorter trip away leaves the server up. */
  @Test
  public void aPageWhoseServerNeverWentAwayIsThawedOnReturning() {
    serverComesUp();
    reachAPage(PAGE_URL);

    controller.stop().start();

    assertRunning();
    assertEquals(PAGE_URL, shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void aRestartThatCouldNotRebindThePortReloadsAtTheNewOrigin() {
    serverComesUp();
    reachAPage(PAGE_URL);

    serverIsStoppedWhileTheAppIsAway();
    controller.start();
    serverComesUp();
    controller.get().loadIfOriginChanged(NEW_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    assertEquals(NEW_ORIGIN_INITIALIZE_URL, shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void aPageThatDiedAgainstTheStoppedServerIsReloaded() {
    serverComesUp();
    reachAFailedPage();

    serverIsStoppedWhileTheAppIsAway();
    controller.start();
    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    assertEquals(SAME_ORIGIN_INITIALIZE_URL, shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void theSavedFragmentIsPutBackOnThePageTheServerServed() {
    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);
    reachAPage(FACILITY_URL);

    assertEquals(restoreScript(PAGE_URL), injectedRestore());
    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(controller.get()));
  }

  /** Pins #15232. */
  @Test
  public void aSignedOutFragmentDoesNotFollowTheRedirectOntoTheNextPage() {
    serverComesUp();
    // Signing out leaves the WebView on the sign-in route.
    reachAPage(AUTH_URL);
    assertEquals(AUTH_PATH, WebViewLocation.getLastPath(controller.get()));

    relaunchAfterAForceClose();
    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, AUTH_PATH);
    // The app key signed the user back in, so /en/auth/ 302'd to the page that role gets.
    reachAPage(DEVICE_URL);

    assertNull(injectedRestore());
    assertEquals(DEVICE_PATH, WebViewLocation.getLastPath(controller.get()));
  }

  /** A restore that outlives its load would yank a later navigation back to the fragment. */
  @Test
  public void aRestoreIsSpentOnTheLoadThatArmedIt() {
    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);
    reachAPage(FACILITY_URL);

    // Each plugin is its own document, so reaching the saved page later is a full load.
    reachAPage(FACILITY_URL);

    assertNull(injectedRestore());
    assertEquals(FACILITY_PATH, WebViewLocation.getLastPath(controller.get()));
  }

  /** The restore the last finished load injected, or {@code null} when it injected none. */
  private String injectedRestore() {
    String script = shadowWebView.getLastEvaluatedJavascript();
    return script != null && script.startsWith(RESTORE_GUARD) ? script : null;
  }

  /** The script a restore to {@code url} injects, guard and all. */
  private static String restoreScript(String url) {
    String quoted = JSONObject.quote(url);
    return RESTORE_GUARD + quoted + ") location.replace(" + quoted + ");";
  }

  private void assertFrozen() {
    assertTrue("WebView paused", shadowWebView.paused);
    assertTrue("WebView timers paused", shadowWebView.timersPaused);
  }

  private void assertRunning() {
    assertFalse("WebView paused", shadowWebView.paused);
    assertFalse("WebView timers paused", shadowWebView.timersPaused);
  }

  private void serverComesUp() {
    KolibriServerViewModel.getInstance().setServerReady(true);
    shadowOf(Looper.getMainLooper()).idle();
  }

  /**
   * A new process, which is the same teardown and setup JUnit does between tests: the WebView has
   * no page, so the restore is armed rather than short-circuited by the same-origin check that
   * keeps a live one.
   */
  private void relaunchAfterAForceClose() {
    tearDown();
    setUp();
  }

  /** Android's idle stop: the activity goes away and the service is torn down behind it. */
  private void serverIsStoppedWhileTheAppIsAway() {
    controller.stop();
    KolibriServerViewModel.getInstance().resetServerState();
    shadowOf(Looper.getMainLooper()).idle();
  }

  private void visitRoute(String url) {
    shadowWebView.pushEntryToHistory(url);
    webView.getWebViewClient().doUpdateVisitedHistory(webView, url, false);
  }

  /** A committed document, as the WebViewClient sees it — what makes the page worth keeping. */
  private void reachAPage(String url) {
    webView.loadUrl(url);
    WebViewClient client = webView.getWebViewClient();
    client.onPageStarted(webView, url, null);
    client.onPageFinished(webView, url);
  }

  /** onPageFinished still fires after a failed main-frame load, for the error page. */
  private void reachAFailedPage() {
    webView.loadUrl(PAGE_URL);
    WebResourceRequest request = mock(WebResourceRequest.class);
    when(request.isForMainFrame()).thenReturn(true);
    WebViewClient client = webView.getWebViewClient();
    client.onPageStarted(webView, PAGE_URL, null);
    client.onReceivedError(webView, request, mock(WebResourceError.class));
    client.onPageFinished(webView, PAGE_URL);
  }

  /**
   * ShadowWebView's own pause/resume flags are sticky, so they cannot tell a thaw before the freeze
   * from one after — the whole question for the onStart gate. Track the current state instead.
   */
  @Implements(WebView.class)
  public static class FreezeTrackingWebView extends ShadowWebView {
    boolean paused;
    boolean timersPaused;

    @Implementation
    @Override
    protected void onPause() {
      super.onPause();
      paused = true;
    }

    @Implementation
    @Override
    protected void onResume() {
      super.onResume();
      paused = false;
    }

    @Implementation
    protected void pauseTimers() {
      timersPaused = true;
    }

    @Implementation
    protected void resumeTimers() {
      timersPaused = false;
    }
  }
}
