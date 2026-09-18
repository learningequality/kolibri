package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.robolectric.Shadows.shadowOf;

import android.os.Looper;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
  private static final String RESTORE_CALL = "location.replace(";
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

    assertEquals(RESTORE_CALL + JSONObject.quote(PAGE_URL) + ");", injectedRestore());
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
    controller
        .get()
        .loadIfOriginChanged(
            SAME_ORIGIN_INITIALIZE_URL, WebViewLocation.getLastPath(controller.get()));
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
    // A redirect landed elsewhere, so this load put nothing back.
    reachAPage(DEVICE_URL);

    // Each plugin is its own document, so reaching the saved page later is a full load.
    reachAPage(FACILITY_URL);

    assertNull(injectedRestore());
    assertEquals(FACILITY_PATH, WebViewLocation.getLastPath(controller.get()));
  }

  /** The restore the last finished load injected, or {@code null} when it injected none. */
  private String injectedRestore() {
    String script = shadowWebView.getLastEvaluatedJavascript();
    return script != null && script.startsWith(RESTORE_CALL) ? script : null;
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
