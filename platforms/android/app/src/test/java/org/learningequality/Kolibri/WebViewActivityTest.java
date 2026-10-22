package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.robolectric.Shadows.shadowOf;

import android.app.Application;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Looper;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import java.util.Arrays;
import java.util.Map;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.learningequality.Kolibri.discovery.DiscoveredServer;
import org.learningequality.Kolibri.discovery.DiscoveredServers;
import org.learningequality.Kolibri.discovery.FakeServerDiscovery;
import org.learningequality.Kolibri.discovery.ServerDiscovery;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implementation;
import org.robolectric.annotation.Implements;
import org.robolectric.shadows.ShadowDialog;
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

  static final String FACILITY_URL = ORIGIN + FACILITY_PATH;
  private static final String AUTH_PATH = "/en/auth/#/signin";
  private static final String AUTH_URL = ORIGIN + AUTH_PATH;
  private static final String DEVICE_PATH = "/en/device/";
  private static final String DEVICE_URL = ORIGIN + DEVICE_PATH;
  private static final String RESTORE_GUARD = "if (location.href !== ";
  private static final String SAME_ORIGIN_INITIALIZE_URL =
      ORIGIN + "/api/device/initialize/abc?auth_token=t";
  private static final String NEW_ORIGIN_INITIALIZE_URL =
      "http://127.0.0.1:45791/api/device/initialize/abc?auth_token=t";

  private static final DiscoveredServer LIBRARY =
      DiscoveredServers.server("abc", "Library", "192.168.1.20");
  private static final String LIBRARY_ORIGIN = "http://192.168.1.20:" + DiscoveredServers.PORT;
  private static final DiscoveredServer LAB =
      DiscoveredServers.server("def", "Lab", "192.168.1.30");

  private static final int[] DIALOG_BUTTONS = {
    DialogInterface.BUTTON_POSITIVE, DialogInterface.BUTTON_NEGATIVE, DialogInterface.BUTTON_NEUTRAL
  };

  private FakeServerDiscovery discovery;
  private ActivityController<WebViewActivity> controller;
  private WebView webView;
  private FreezeTrackingWebView shadowWebView;

  @Before
  public void setUp() {
    ServerSelection.selectLocal(application());
    launch();
  }

  @After
  public void tearDown() {
    controller.close();
    ServerDiscovery.setInstanceForTesting(null);
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

  @Test
  public void aRemoteServerLoadsAtItsBaseUrlWithNoToken() {
    Map<String, String> txt = DiscoveredServers.kolibriTxt("abc", "Library");
    txt.put("prefix", "\"/kolibri/\"");
    DiscoveredServer prefixed =
        DiscoveredServer.fromTxt(txt, "192.168.1.20", DiscoveredServers.PORT);

    controller.get().showRemote(prefixed);

    assertEquals(LIBRARY_ORIGIN + "/kolibri/", shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void showingARemoteServerStopsTheLocalOne() {
    controller.get().showRemote(LIBRARY);

    assertServerService(shadowOf(application()).getNextStoppedService());
  }

  @Test
  public void aRemoteChoiceIsRemembered() {
    controller.get().showRemote(LIBRARY);

    assertEquals(LIBRARY, controller.get().currentServer());
    assertEquals("abc", ServerSelection.get(application()));
  }

  @Test
  public void aRemoteSelectionStartsNoLocalServerOnReturning() {
    controller.get().showRemote(LIBRARY);
    controller.stop();
    shadowOf(application()).clearStartedServices();

    controller.start();

    assertNull(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void aLocalSelectionRestartsTheServerOnReturning() {
    ServerSelection.selectLocal(application());
    controller.stop();
    shadowOf(application()).clearStartedServices();

    controller.start();

    assertServerService(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void aRemotePageIsThawedOnReturning() {
    controller.get().showRemote(LIBRARY);
    reachAPage(LIBRARY_ORIGIN + FACILITY_PATH);

    controller.stop().start();

    assertRunning();
  }

  @Test
  public void theSelectedServerStaysInAppOnAnyOfItsPorts() {
    controller.get().showRemote(LIBRARY);

    assertTrue(staysInApp(LIBRARY_ORIGIN + FACILITY_PATH));
    assertTrue(staysInApp("http://192.168.1.20:8081/zipcontent/a.zip/index.html"));
  }

  @Test
  public void loopbackStaysInAppWhileRemote() {
    controller.get().showRemote(LIBRARY);

    assertTrue(staysInApp(PAGE_URL));
  }

  @Test
  public void anUnselectedHostOpensInTheBrowserWhileRemote() {
    controller.get().showRemote(LIBRARY);

    assertOpensInTheBrowser(LAB.getBaseUrl());
    assertOpensInTheBrowser("https://learningequality.org/");
  }

  @Test
  public void switchingBackToLocalStartsTheServer() {
    controller.get().showRemote(LIBRARY);
    shadowOf(application()).clearStartedServices();

    controller.get().showLocal();

    assertServerService(shadowOf(application()).getNextStartedService());
    assertNull(controller.get().currentServer());
    assertEquals(ServerSelection.LOCAL, ServerSelection.get(application()));
  }

  @Test
  public void switchingBackToLocalSendsTheOldRemoteToTheBrowser() {
    controller.get().showRemote(LIBRARY);

    controller.get().showLocal();

    assertOpensInTheBrowser(LIBRARY.getBaseUrl());
  }

  @Test
  public void switchingBackToLocalCoversTheRemotePageUntilTheLocalOneLoads() {
    controller.get().showRemote(LIBRARY);
    reachAPage(LIBRARY_ORIGIN + FACILITY_PATH);

    controller.get().showLocal();
    reachAPage(LIBRARY_ORIGIN + PAGE_PATH);

    assertCovered();

    reachAPage(PAGE_URL);

    assertUncovered();
  }

  @Test
  public void switchingBackToLocalUnloadsTheRemotePage() {
    controller.get().showRemote(LIBRARY);
    reachAPage(LIBRARY_ORIGIN + FACILITY_PATH);

    controller.get().showLocal();

    assertEquals("about:blank", shadowWebView.getLastLoadedUrl());

    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    assertEquals(SAME_ORIGIN_INITIALIZE_URL, shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void choosingLocalWhileAlreadyLocalLeavesThePageUncovered() {
    serverComesUp();
    reachAPage(PAGE_URL);

    controller.get().showLocal();

    assertUncovered();
  }

  @Test
  public void theServerChipSitsBelowThePageRatherThanOverIt() {
    serverComesUp();
    reachAPage(PAGE_URL);
    View root = controller.get().findViewById(R.id.root_container);
    root.measure(
        View.MeasureSpec.makeMeasureSpec(360, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(640, View.MeasureSpec.EXACTLY));
    root.layout(0, 0, 360, 640);
    View chip = controller.get().findViewById(R.id.server_chip);

    assertTrue("chip is laid out", chip.getHeight() > 0);
    assertTrue(
        "chip is below the page",
        topInWindow(chip) >= topInWindow(webView) + webView.getHeight());
  }

  @Test
  public void aLocalLoadLandingAfterSwitchingToARemoteIsDropped() {
    controller.get().showRemote(LIBRARY);

    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    assertEquals(LIBRARY.getBaseUrl(), shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void remoteNavigationsLeaveTheSavedLocalPathAlone() {
    serverComesUp();
    reachAPage(PAGE_URL);

    controller.get().showRemote(LIBRARY);
    reachAPage(LIBRARY_ORIGIN + FACILITY_PATH);
    webView.getWebViewClient().doUpdateVisitedHistory(webView, LIBRARY_ORIGIN + PAGE_PATH, false);

    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(controller.get()));
  }

  @Test
  public void aPendingLocalRestoreIsNotPutOnARemotePage() {
    serverComesUp();
    controller.get().loadIfOriginChanged(SAME_ORIGIN_INITIALIZE_URL, PAGE_PATH);

    controller.get().showRemote(LIBRARY);
    reachAPage(LIBRARY_ORIGIN + FACILITY_PATH);

    assertNull(injectedRestore());
  }

  @Test
  public void aFirstRunWithSeveralServersNearbyOffersThemAndThisDevice() {
    relaunchWithNothingChosen();

    discovery.answer(LIBRARY, LAB);

    Dialog picker = ServerSheetTest.sheet();
    assertTrue(picker.isShowing());
    assertFalse(shadowOf(picker).isCancelable());
    assertEquals(
        Arrays.asList(application().getString(R.string.start_my_own_kolibri), "Library", "Lab"),
        ServerSheetTest.rowNames());
    assertNull(shadowWebView.getLastLoadedUrl());
    assertNull(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void aFirstRunWithOneServerNearbyOpensIt() {
    relaunchWithNothingChosen();

    discovery.answer(LIBRARY);

    assertEquals(LIBRARY.getBaseUrl(), shadowWebView.getLastLoadedUrl());
    assertEquals("abc", ServerSelection.get(application()));
    assertNull(ShadowDialog.getLatestDialog());
  }

  @Test
  public void aFirstRunWithNoServerNearbyStartsItsOwn() {
    relaunchWithNothingChosen();
    assertNull(shadowOf(application()).getNextStartedService());

    discovery.answer();

    assertServerService(shadowOf(application()).getNextStartedService());
    assertEquals(ServerSelection.LOCAL, ServerSelection.get(application()));
  }

  @Test
  public void aLocalSelectionStartsTheServerWithoutWaitingForDiscovery() {
    assertServerService(shadowOf(application()).getNextStartedService());
    assertEquals(1, discovery.calls());
  }

  @Test
  public void aLaunchSearchForARememberedServerEndsOnceItIsFound() {
    relaunchWithRemoteChosen(LIBRARY);

    assertEquals("abc", discovery.awaitedInstanceId());
  }

  @Test
  public void aSearchFromTheSheetWaitsForEveryServer() {
    relaunchWithRemoteChosen(LIBRARY);
    discovery.answer(LIBRARY);

    controller.get().findViewById(R.id.server_chip).performClick();

    assertEquals(2, discovery.calls());
    assertNull(discovery.awaitedInstanceId());
  }

  @Test
  public void aRememberedServerFoundAtANewAddressLoadsThere() {
    relaunchWithRemoteChosen(LIBRARY);

    discovery.answer(DiscoveredServers.server("abc", "Library", "192.168.1.99"));

    assertEquals(
        "http://192.168.1.99:" + DiscoveredServers.PORT + "/", shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void aLaunchSearchEndingWhileTheAppIsAwayLoadsTheServerOnReturning() {
    relaunchWithRemoteChosen(LIBRARY);
    controller.stop();

    discovery.answer(LIBRARY);

    assertNull(shadowWebView.getLastLoadedUrl());
    assertFrozen();

    controller.start();

    assertEquals(LIBRARY.getBaseUrl(), shadowWebView.getLastLoadedUrl());
    assertRunning();
  }

  @Test
  public void aFirstRunWhoseSearchCouldNotRunChoosesNothing() {
    relaunchWithNothingChosen();

    discovery.fail();

    AlertDialog dialog = unreachableDialog();
    assertTrue(dialog.isShowing());
    assertFalse(shadowOf(dialog).isCancelable());
    TextView message = dialog.findViewById(android.R.id.message);
    assertEquals(
        application().getString(R.string.server_search_failed), message.getText().toString());
    assertNull(ServerSelection.get(application()));
    assertNull(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void tryingAgainAfterAFirstRunSearchCouldNotRunOpensTheServerFound() {
    relaunchWithNothingChosen();
    discovery.fail();

    clickDialogButton(R.string.server_unreachable_try_again);
    assertEquals(2, discovery.calls());
    discovery.answer(LIBRARY);

    assertEquals(LIBRARY.getBaseUrl(), shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void startingItsOwnAfterAFirstRunSearchCouldNotRunStartsTheServer() {
    relaunchWithNothingChosen();
    discovery.fail();

    clickDialogButton(R.string.start_my_own_kolibri);

    assertServerService(shadowOf(application()).getNextStartedService());
    assertEquals(ServerSelection.LOCAL, ServerSelection.get(application()));
  }

  @Test
  public void aRememberedServerWhoseSearchCouldNotRunIsUnreachable() {
    relaunchWithRemoteChosen(LIBRARY);

    discovery.fail();

    TextView message = unreachableDialog().findViewById(android.R.id.message);
    assertEquals(
        application().getString(R.string.server_unreachable, "Library"),
        message.getText().toString());
    assertEquals("abc", ServerSelection.get(application()));
  }

  @Test
  public void aMissingRememberedServerIsNamedInTheDialog() {
    relaunchWithRemoteChosen(LIBRARY);

    discovery.answer(LAB);

    AlertDialog dialog = unreachableDialog();
    assertTrue(dialog.isShowing());
    assertFalse(shadowOf(dialog).isCancelable());
    TextView message = dialog.findViewById(android.R.id.message);
    assertEquals(
        application().getString(R.string.server_unreachable, "Library"),
        message.getText().toString());
    assertNull(shadowWebView.getLastLoadedUrl());
    assertNull(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void tryingAgainForAMissingServerSearchesAgainAndLoadsItOnceFound() {
    relaunchWithRemoteChosen(LIBRARY);
    discovery.answer(LAB);

    clickDialogButton(R.string.server_unreachable_try_again);
    assertEquals(2, discovery.calls());
    discovery.answer(LIBRARY);

    assertEquals(LIBRARY.getBaseUrl(), shadowWebView.getLastLoadedUrl());
  }

  @Test
  public void choosingAnotherServerForAMissingOneListsWhatWasFound() {
    relaunchWithRemoteChosen(LIBRARY);
    discovery.answer(LAB);

    clickDialogButton(R.string.server_unreachable_choose_another);

    assertTrue(ServerSheetTest.sheet().isShowing());
    assertEquals(
        Arrays.asList(application().getString(R.string.server_local), "Lab"),
        ServerSheetTest.rowNames());
  }

  @Test
  public void usingThisDeviceForAMissingServerSwitchesToIt() {
    relaunchWithRemoteChosen(LIBRARY);
    discovery.answer();

    clickDialogButton(R.string.server_unreachable_use_local);

    assertServerService(shadowOf(application()).getNextStartedService());
    assertEquals(ServerSelection.LOCAL, ServerSelection.get(application()));
  }

  @Test
  public void aLaunchSearchEndingAfterTheActivityIsGoneDoesNothing() {
    relaunchWithNothingChosen();
    controller.close();

    discovery.answer(LIBRARY);

    assertNull(ServerSelection.get(application()));
  }

  private static Application application() {
    return RuntimeEnvironment.getApplication();
  }

  private void launch() {
    discovery = new FakeServerDiscovery();
    ServerDiscovery.setInstanceForTesting(discovery);
    controller = Robolectric.buildActivity(WebViewActivity.class).setup();
    webView = controller.get().findViewById(R.id.webview);
    shadowWebView = (FreezeTrackingWebView) shadowOf(webView);
  }

  private void relaunchWithNothingChosen() {
    relaunchAfter(
        () ->
            application()
                .getSharedPreferences("kolibri_server", Context.MODE_PRIVATE)
                .edit()
                .clear()
                .commit());
  }

  private void relaunchWithRemoteChosen(DiscoveredServer server) {
    relaunchAfter(() -> ServerSelection.selectRemote(application(), server));
  }

  private void relaunchAfter(Runnable choose) {
    controller.close();
    choose.run();
    shadowOf(application()).clearStartedServices();
    launch();
  }

  private static AlertDialog unreachableDialog() {
    return (AlertDialog) ShadowDialog.getLatestDialog();
  }

  private static void clickDialogButton(int label) {
    AlertDialog dialog = unreachableDialog();
    String text = application().getString(label);
    for (int which : DIALOG_BUTTONS) {
      Button button = dialog.getButton(which);
      if (button != null && text.contentEquals(button.getText())) {
        ServerSheetTest.click(button);
        return;
      }
    }
    throw new AssertionError("No button labelled " + text);
  }

  static void assertServerService(Intent intent) {
    assertNotNull(intent);
    assertEquals(KolibriServerService.class.getName(), intent.getComponent().getClassName());
  }

  private boolean staysInApp(String url) {
    WebResourceRequest request = mock(WebResourceRequest.class);
    when(request.getUrl()).thenReturn(Uri.parse(url));
    return !webView.getWebViewClient().shouldOverrideUrlLoading(webView, request);
  }

  private void assertOpensInTheBrowser(String url) {
    assertFalse(staysInApp(url));
    Intent intent = shadowOf(controller.get()).getNextStartedActivity();
    assertNotNull(intent);
    assertEquals(Intent.ACTION_VIEW, intent.getAction());
    assertEquals(Uri.parse(url), intent.getData());
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

  private void assertCovered() {
    assertEquals(
        View.VISIBLE, controller.get().findViewById(R.id.splash_container).getVisibility());
    assertEquals(View.GONE, controller.get().findViewById(R.id.server_chip).getVisibility());
  }

  private void assertUncovered() {
    assertEquals(View.GONE, controller.get().findViewById(R.id.splash_container).getVisibility());
    assertEquals(View.VISIBLE, controller.get().findViewById(R.id.server_chip).getVisibility());
  }

  private static int topInWindow(View view) {
    int[] location = new int[2];
    view.getLocationInWindow(location);
    return location[1];
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
    reachAPage(webView, url);
  }

  static void reachAPage(WebView webView, String url) {
    webView.loadUrl(url);
    WebViewClient client = webView.getWebViewClient();
    client.onPageStarted(webView, url, null);
    client.onPageFinished(webView, url);
  }

  /** onPageFinished still fires after a failed main-frame load, for the error page. */
  private void reachAFailedPage() {
    reachAFailedPage(webView, PAGE_URL);
  }

  static void reachAFailedPage(WebView webView, String url) {
    webView.loadUrl(url);
    WebResourceRequest request = mock(WebResourceRequest.class);
    when(request.isForMainFrame()).thenReturn(true);
    WebViewClient client = webView.getWebViewClient();
    client.onPageStarted(webView, url, null);
    client.onReceivedError(webView, request, mock(WebResourceError.class));
    client.onPageFinished(webView, url);
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
