package org.learningequality.Kolibri.discovery;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

public final class DiscoveredServer {

  private final String instanceId;
  private final String deviceName;
  private final String ip;
  private final int port;
  private final String prefix;
  private final boolean subsetOfUsersDevice;

  private DiscoveredServer(
      String instanceId,
      String deviceName,
      String ip,
      int port,
      String prefix,
      boolean subsetOfUsersDevice) {
    this.instanceId = instanceId;
    this.deviceName = deviceName;
    this.ip = ip;
    this.port = port;
    this.prefix = prefix;
    this.subsetOfUsersDevice = subsetOfUsersDevice;
  }

  /** Returns null when the TXT record is not a Kolibri server's. */
  public static DiscoveredServer fromTxt(Map<String, String> txt, String ip, int port) {
    Object instanceId = decode(txt.get("instance_id"));
    Object deviceName = decode(txt.get("device_name"));
    if (instanceId == null || deviceName == null) {
      return null;
    }
    Object prefix = decode(txt.get("prefix"));
    Object subsetOfUsersDevice = decode(txt.get("subset_of_users_device"));
    return new DiscoveredServer(
        instanceId.toString(),
        deviceName.toString(),
        ip,
        port,
        prefix == null ? "" : prefix.toString().replaceFirst("^/+", ""),
        Boolean.TRUE.equals(subsetOfUsersDevice) || "TRUE".equals(subsetOfUsersDevice));
  }

  private static Object decode(String json) {
    if (json == null) {
      return null;
    }
    try {
      Object value = new JSONTokener(json).nextValue();
      return JSONObject.NULL.equals(value) ? null : value;
    } catch (JSONException e) {
      return null;
    }
  }

  static List<DiscoveredServer> eligible(
      Collection<DiscoveredServer> found, Collection<String> ownAddresses) {
    List<DiscoveredServer> eligible = new ArrayList<>();
    Set<String> seenIds = new HashSet<>();
    for (DiscoveredServer server : found) {
      if (!server.subsetOfUsersDevice
          && !ownAddresses.contains(server.ip)
          && seenIds.add(server.instanceId)) {
        eligible.add(server);
      }
    }
    return eligible;
  }

  public String getInstanceId() {
    return instanceId;
  }

  public String getDeviceName() {
    return deviceName;
  }

  public String getIp() {
    return ip;
  }

  public String getBaseUrl() {
    return "http://" + ip + ":" + port + "/" + prefix;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (!(o instanceof DiscoveredServer)) {
      return false;
    }
    DiscoveredServer other = (DiscoveredServer) o;
    return port == other.port
        && subsetOfUsersDevice == other.subsetOfUsersDevice
        && instanceId.equals(other.instanceId)
        && deviceName.equals(other.deviceName)
        && ip.equals(other.ip)
        && prefix.equals(other.prefix);
  }

  @Override
  public int hashCode() {
    return Objects.hash(instanceId, deviceName, ip, port, prefix, subsetOfUsersDevice);
  }
}
