package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.robolectric.Shadows.shadowOf;

import android.app.Application;
import android.app.Dialog;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.TextView;
import com.google.android.material.chip.Chip;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
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
import org.robolectric.shadows.ShadowDialog;

@RunWith(RobolectricTestRunner.class)
public class ServerSheetTest {

  private static final DiscoveredServer LIBRARY =
      DiscoveredServers.server("abc", "Library", "192.168.1.20");
  private static final DiscoveredServer LAB =
      DiscoveredServers.server("def", "Lab", "192.168.1.30");

  private FakeServerDiscovery discovery;
  private ActivityController<WebViewActivity> controller;
  private Chip chip;
  private String localLabel;

  @Before
  public void setUp() {
    discovery = new FakeServerDiscovery();
    ServerDiscovery.setInstanceForTesting(discovery);
    ServerSelection.selectLocal(application());
    controller = Robolectric.buildActivity(WebViewActivity.class).setup();
    chip = controller.get().findViewById(R.id.server_chip);
    localLabel = application().getString(R.string.server_local);
  }

  @After
  public void tearDown() {
    controller.close();
    ServerDiscovery.setInstanceForTesting(null);
  }

  @Test
  public void theChipAppearsOnceAPageLoads() {
    assertEquals(View.GONE, chip.getVisibility());

    reachAPage(WebViewActivityTest.FACILITY_URL);

    assertEquals(View.VISIBLE, chip.getVisibility());
  }

  @Test
  public void theChipNamesTheServerShown() {
    reachAPage(WebViewActivityTest.FACILITY_URL);
    assertEquals(localLabel, chip.getText().toString());

    controller.get().showRemote(LIBRARY);

    assertEquals("Library", chip.getText().toString());
    assertEquals(
        application().getString(R.string.server_chip_description, "Library"),
        chip.getContentDescription().toString());
  }

  @Test
  public void theSheetListsThisDeviceFirstThenEachDiscoveredServer() {
    openSheet();
    discovery.answer(LIBRARY, LAB);

    assertEquals(Arrays.asList(localLabel, "Library", "Lab"), rowNames());
  }

  @Test
  public void openingTheSheetSearchesForServers() {
    discovery.answer();
    openSheet();

    assertEquals(2, discovery.calls());
    assertEquals(View.VISIBLE, sheetView(R.id.server_progress).getVisibility());

    discovery.answer(LIBRARY);

    assertEquals(View.GONE, sheetView(R.id.server_progress).getVisibility());
  }

  @Test
  public void theServerShownIsMarkedSelected() {
    controller.get().showRemote(LIBRARY);
    openSheet();
    discovery.answer(LIBRARY, LAB);

    assertFalse(row(localLabel).isSelected());
    assertTrue(row("Library").isSelected());
    assertFalse(row("Lab").isSelected());
  }

  @Test
  public void thisDeviceIsMarkedSelectedWhileLocal() {
    openSheet();
    discovery.answer(LIBRARY);

    assertTrue(row(localLabel).isSelected());
    assertFalse(row("Library").isSelected());
  }

  @Test
  public void pickingADiscoveredServerShowsIt() {
    openSheet();
    discovery.answer(LIBRARY, LAB);

    click(row("Lab"));

    assertEquals(LAB, controller.get().currentServer());
    assertFalse(sheet().isShowing());
  }

  @Test
  public void pickingTheServerShownOnlyClosesTheSheet() {
    controller.get().showRemote(LIBRARY);
    openSheet();
    discovery.answer(LIBRARY);

    click(row("Library"));

    assertEquals(WebViewActivityTest.FACILITY_URL, shadowOf(webView()).getLastLoadedUrl());
    assertFalse(sheet().isShowing());
  }

  @Test
  public void pickingTheServerShownAtItsNewAddressLoadsIt() {
    DiscoveredServer moved = DiscoveredServers.server("abc", "Library", "192.168.1.21");
    controller.get().showRemote(LIBRARY);
    openSheet();
    discovery.answer(moved);

    click(row("Library"));

    assertEquals(moved.getBaseUrl(), shadowOf(webView()).getLastLoadedUrl());
    assertEquals(moved, controller.get().currentServer());
  }

  @Test
  public void pickingTheServerShownAfterItsPageFailedReloadsIt() {
    controller.get().showRemote(LIBRARY);
    openSheet();
    discovery.answer(LIBRARY);
    WebViewActivityTest.reachAFailedPage(webView(), LIBRARY.getBaseUrl() + "en/learn/");

    click(row("Library"));

    assertEquals(LIBRARY.getBaseUrl(), shadowOf(webView()).getLastLoadedUrl());
  }

  @Test
  public void pickingThisDeviceSwitchesBackToIt() {
    controller.get().showRemote(LIBRARY);
    openSheet();
    discovery.answer(LIBRARY);

    click(row(localLabel));

    assertNull(controller.get().currentServer());
    assertEquals(ServerSelection.LOCAL, ServerSelection.get(application()));
  }

  @Test
  public void pickingThisDeviceWhileItIsShownOnlyClosesTheSheet() {
    openSheet();
    discovery.answer();
    shadowOf(application()).clearStartedServices();

    click(row(localLabel));

    assertNull(shadowOf(application()).getNextStartedService());
    assertFalse(sheet().isShowing());
  }

  @Test
  public void pickingThisDeviceAfterItsServerFailedRestartsIt() {
    WebViewActivityTest.reachAFailedPage(webView(), WebViewActivityTest.FACILITY_URL);
    KolibriServerViewModel.getInstance().resetServerState();
    click(chip);
    discovery.answer();
    shadowOf(application()).clearStartedServices();

    click(row(localLabel));

    WebViewActivityTest.assertServerService(shadowOf(application()).getNextStartedService());
  }

  @Test
  public void withNothingFoundConnectingSearchesAgainAndListsWhatItFinds() {
    openSheet();
    discovery.answer();
    View connect = sheetView(R.id.server_connect_nearby);
    assertEquals(View.VISIBLE, connect.getVisibility());

    click(connect);
    discovery.answer(LAB);

    assertEquals(2, discovery.calls());
    assertEquals(Arrays.asList(localLabel, "Lab"), rowNames());
    assertEquals(View.GONE, connect.getVisibility());
  }

  @Test
  public void aSearchThatCouldNotRunSaysSoAndOffersToSearchAgain() {
    openSheet();

    discovery.fail();

    TextView status = (TextView) sheetView(R.id.server_status);
    assertEquals(
        application().getString(R.string.server_search_failed), status.getText().toString());
    assertEquals(View.VISIBLE, sheetView(R.id.server_connect_nearby).getVisibility());
    assertEquals(Arrays.asList(localLabel), rowNames());
  }

  @Test
  public void aReopenedSheetListsTheLastServersFoundWhileSearching() {
    openSheet();
    discovery.answer(LIBRARY);
    sheet().dismiss();

    openSheet();

    assertEquals(Arrays.asList(localLabel, "Library"), rowNames());
  }

  private static Application application() {
    return RuntimeEnvironment.getApplication();
  }

  private WebView webView() {
    return controller.get().findViewById(R.id.webview);
  }

  private void reachAPage(String url) {
    WebViewActivityTest.reachAPage(webView(), url);
  }

  private void openSheet() {
    reachAPage(WebViewActivityTest.FACILITY_URL);
    click(chip);
  }

  static void click(View view) {
    view.performClick();
    shadowOf(Looper.getMainLooper()).idle();
  }

  static Dialog sheet() {
    return ShadowDialog.getLatestDialog();
  }

  private static View sheetView(int id) {
    return sheet().findViewById(id);
  }

  private static List<View> rows() {
    ViewGroup list = (ViewGroup) sheetView(R.id.server_list);
    List<View> rows = new ArrayList<>();
    for (int i = 0; i < list.getChildCount(); i++) {
      rows.add(list.getChildAt(i));
    }
    return rows;
  }

  static List<String> rowNames() {
    List<String> names = new ArrayList<>();
    for (View row : rows()) {
      names.add(((TextView) row).getText().toString());
    }
    return names;
  }

  private static View row(String name) {
    for (View row : rows()) {
      if (name.contentEquals(((TextView) row).getText())) {
        return row;
      }
    }
    throw new AssertionError("No row named " + name);
  }
}
