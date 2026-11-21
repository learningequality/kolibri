package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import java.io.File;
import java.io.IOException;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.learningequality.Kolibri.discovery.DiscoveredServer;
import org.learningequality.Kolibri.discovery.DiscoveredServers;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class ServerSelectionTest {

  private Context context;
  private File database;

  private static DiscoveredServer server(String instanceId, String deviceName) {
    return DiscoveredServers.server(instanceId, deviceName, "192.168.1.20");
  }

  @Before
  public void setUp() {
    context = RuntimeEnvironment.getApplication();
    context.getSharedPreferences("kolibri_server", Context.MODE_PRIVATE).edit().clear().commit();
    File kolibriHome = KolibriEnvironmentInitializer.kolibriHome(context);
    kolibriHome.mkdirs();
    database = new File(kolibriHome, "db.sqlite3");
    database.delete();
  }

  @Test
  public void get_isNullWhenNothingWasChosen() {
    assertNull(ServerSelection.get(context));
    assertNull(ServerSelection.getRemoteName(context));
  }

  @Test
  public void selectLocal_storesLocal() {
    ServerSelection.selectLocal(context);

    assertEquals(ServerSelection.LOCAL, ServerSelection.get(context));
  }

  @Test
  public void selectRemote_storesTheServersIdAndName() {
    ServerSelection.selectRemote(context, server("abc", "Library"));

    assertEquals("abc", ServerSelection.get(context));
    assertEquals("Library", ServerSelection.getRemoteName(context));
  }

  @Test
  public void selectLocal_replacesARemoteSelection() {
    ServerSelection.selectRemote(context, server("abc", "Library"));

    ServerSelection.selectLocal(context);

    assertEquals(ServerSelection.LOCAL, ServerSelection.get(context));
    assertNull(ServerSelection.getRemoteName(context));
  }

  @Test
  public void selectRemote_replacesAnotherRemoteSelection() {
    ServerSelection.selectRemote(context, server("abc", "Library"));

    ServerSelection.selectRemote(context, server("def", "Lab"));

    assertEquals("def", ServerSelection.get(context));
    assertEquals("Lab", ServerSelection.getRemoteName(context));
  }

  @Test
  public void adoptExistingInstall_selectsLocalWhenThereIsALocalDatabase() throws IOException {
    assertTrue(database.createNewFile());

    ServerSelection.adoptExistingInstall(context);

    assertEquals(ServerSelection.LOCAL, ServerSelection.get(context));
  }

  @Test
  public void adoptExistingInstall_leavesAFreshInstallUnchosen() {
    ServerSelection.adoptExistingInstall(context);

    assertNull(ServerSelection.get(context));
  }

  @Test
  public void adoptExistingInstall_leavesAFreshInstallUnchosenOnceItsDatabaseExists()
      throws IOException {
    ServerSelection.adoptExistingInstall(context);
    assertTrue(database.createNewFile());

    ServerSelection.adoptExistingInstall(context);

    assertNull(ServerSelection.get(context));
  }

  @Test
  public void adoptExistingInstall_keepsAChosenRemote() throws IOException {
    assertTrue(database.createNewFile());
    ServerSelection.selectRemote(context, server("abc", "Library"));

    ServerSelection.adoptExistingInstall(context);

    assertEquals("abc", ServerSelection.get(context));
  }
}
