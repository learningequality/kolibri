package org.learningequality.Kolibri.discovery;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.learningequality.Kolibri.discovery.DiscoveredServers.PORT;
import static org.learningequality.Kolibri.discovery.DiscoveredServers.kolibriTxt;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class DiscoveredServerTest {

  private static final String IP = "192.168.1.20";

  private static DiscoveredServer server(String instanceId, String ip) {
    return DiscoveredServers.server(instanceId, "Room " + instanceId, ip);
  }

  @Test
  public void fromTxt_rejectsARecordWithoutAnInstanceId() {
    Map<String, String> txt = kolibriTxt("abc", "Library");
    txt.remove("instance_id");

    assertNull(DiscoveredServer.fromTxt(txt, IP, PORT));
  }

  @Test
  public void fromTxt_rejectsARecordWithoutADeviceName() {
    Map<String, String> txt = kolibriTxt("abc", "Library");
    txt.remove("device_name");

    assertNull(DiscoveredServer.fromTxt(txt, IP, PORT));
  }

  @Test
  public void fromTxt_decodesTheJsonEncodedValues() {
    DiscoveredServer server =
        DiscoveredServer.fromTxt(kolibriTxt("abc", "Room \\\"4\\\""), IP, PORT);

    assertEquals("abc", server.getInstanceId());
    assertEquals("Room \"4\"", server.getDeviceName());
  }

  @Test
  public void baseUrl_isTheServerRootWhenThereIsNoPrefix() {
    DiscoveredServer server = DiscoveredServer.fromTxt(kolibriTxt("abc", "Library"), IP, PORT);

    assertEquals("http://192.168.1.20:8080/", server.getBaseUrl());
  }

  @Test
  public void baseUrl_isTheServerRootForARootPrefix() {
    Map<String, String> txt = kolibriTxt("abc", "Library");
    txt.put("prefix", "\"/\"");

    assertEquals("http://192.168.1.20:8080/", DiscoveredServer.fromTxt(txt, IP, PORT).getBaseUrl());
  }

  @Test
  public void baseUrl_keepsAPathPrefixWithASingleSlash() {
    Map<String, String> txt = kolibriTxt("abc", "Library");
    txt.put("prefix", "\"/kolibri/\"");

    assertEquals(
        "http://192.168.1.20:8080/kolibri/", DiscoveredServer.fromTxt(txt, IP, PORT).getBaseUrl());
  }

  @Test
  public void eligible_dropsASubsetOfUsersDevice() {
    Map<String, String> soudTxt = kolibriTxt("soud", "Tablet");
    soudTxt.put("subset_of_users_device", "\"TRUE\"");
    Map<String, String> fullTxt = kolibriTxt("full", "Library");
    fullTxt.put("subset_of_users_device", "\"FALSE\"");
    DiscoveredServer soud = DiscoveredServer.fromTxt(soudTxt, "192.168.1.21", PORT);
    DiscoveredServer full = DiscoveredServer.fromTxt(fullTxt, IP, PORT);

    List<DiscoveredServer> eligible =
        DiscoveredServer.eligible(Arrays.asList(soud, full), Collections.emptyList());

    assertEquals(Collections.singletonList(full), eligible);
  }

  @Test
  public void eligible_dropsASubsetOfUsersDeviceFlaggedWithAJsonBoolean() {
    Map<String, String> soudTxt = kolibriTxt("soud", "Tablet");
    soudTxt.put("subset_of_users_device", "true");
    DiscoveredServer soud = DiscoveredServer.fromTxt(soudTxt, IP, PORT);

    assertEquals(
        Collections.emptyList(),
        DiscoveredServer.eligible(Collections.singletonList(soud), Collections.emptyList()));
  }

  @Test
  public void eligible_keepsAServerThatDoesNotSayWhetherItIsASubsetOfUsersDevice() {
    DiscoveredServer server = server("abc", IP);

    assertEquals(
        Collections.singletonList(server),
        DiscoveredServer.eligible(Collections.singletonList(server), Collections.emptyList()));
  }

  @Test
  public void eligible_dropsThisDevicesOwnServer() {
    DiscoveredServer own = server("own", "192.168.1.5");
    DiscoveredServer other = server("other", IP);

    List<DiscoveredServer> eligible =
        DiscoveredServer.eligible(
            Arrays.asList(own, other), Arrays.asList("10.0.0.3", "192.168.1.5"));

    assertEquals(Collections.singletonList(other), eligible);
  }

  @Test
  public void eligible_listsAServerAnsweringOnTwoInterfacesOnce() {
    DiscoveredServer wifi = server("abc", IP);
    DiscoveredServer ethernet = server("abc", "10.0.0.20");

    List<DiscoveredServer> eligible =
        DiscoveredServer.eligible(Arrays.asList(wifi, ethernet), Collections.emptyList());

    assertEquals(Collections.singletonList(wifi), eligible);
  }

  @Test
  public void eligible_keepsDiscoveryOrder() {
    DiscoveredServer second = server("b", "192.168.1.22");
    DiscoveredServer first = server("a", "192.168.1.21");

    assertEquals(
        Arrays.asList(second, first),
        DiscoveredServer.eligible(Arrays.asList(second, first), Collections.emptyList()));
  }
}
