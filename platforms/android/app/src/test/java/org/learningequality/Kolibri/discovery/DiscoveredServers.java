package org.learningequality.Kolibri.discovery;

import java.util.HashMap;
import java.util.Map;

public final class DiscoveredServers {

  public static final int PORT = 8080;

  private DiscoveredServers() {}

  public static Map<String, String> kolibriTxt(String instanceId, String deviceName) {
    Map<String, String> txt = new HashMap<>();
    txt.put("instance_id", "\"" + instanceId + "\"");
    txt.put("device_name", "\"" + deviceName + "\"");
    return txt;
  }

  public static DiscoveredServer server(String instanceId, String deviceName, String ip) {
    return DiscoveredServer.fromTxt(kolibriTxt(instanceId, deviceName), ip, PORT);
  }
}
