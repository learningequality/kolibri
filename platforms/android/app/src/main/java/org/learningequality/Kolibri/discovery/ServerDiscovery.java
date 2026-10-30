package org.learningequality.Kolibri.discovery;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.annotation.VisibleForTesting;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.learningequality.Kolibri.util.NetworkUtils;

/**
 * Hand-rolled mDNS rather than NsdManager: zeroconf-py2compat 0.19.17, which deployed Kolibri
 * servers run, answers a PTR question only for the exact {@code Kolibri._sub._http._tcp.local.}
 * subtype, and its {@code Engine.handle_read} ignores queries whose source port is not 5353 or 53.
 */
public class ServerDiscovery {

  private static final String TAG = "KolibriServerDiscovery";
  private static final int MAX_PACKET_SIZE = 9000;

  static final String SERVICE_NAME = "Kolibri._sub._http._tcp.local.";
  private static final long DISCOVERY_WINDOW_MS = 3000;
  private static final long QUERY_INTERVAL_MS = 1000;

  private static final String SERVICE_KEY = key(SERVICE_NAME);
  private static final InetSocketAddress MDNS_GROUP = new InetSocketAddress("224.0.0.251", 5353);

  private static volatile ServerDiscovery instance;

  private final Context context;
  private final InetSocketAddress group;
  private final Supplier<List<NetworkInterface>> interfaces;
  private final Supplier<Collection<String>> ownAddresses;

  @VisibleForTesting
  ServerDiscovery(
      Context context,
      InetSocketAddress group,
      Supplier<List<NetworkInterface>> interfaces,
      Supplier<Collection<String>> ownAddresses) {
    this.context = context;
    this.group = group;
    this.interfaces = interfaces;
    this.ownAddresses = ownAddresses;
  }

  public static ServerDiscovery getInstance(Context context) {
    if (instance == null) {
      synchronized (ServerDiscovery.class) {
        if (instance == null) {
          instance =
              new ServerDiscovery(
                  context.getApplicationContext(),
                  MDNS_GROUP,
                  NetworkUtils::getActiveIPv4Interfaces,
                  NetworkUtils::getActiveIPv4Addresses);
        }
      }
    }
    return instance;
  }

  @VisibleForTesting
  public static void setInstanceForTesting(ServerDiscovery discovery) {
    instance = discovery;
  }

  /**
   * Calls back once, off the UI thread, with the eligible servers found.
   *
   * @param awaitedInstanceId an {@code instance_id} whose arrival ends the search early, or {@code
   *     null} to search the whole window
   * @param callback receives {@code null} when the search could not run
   */
  public void discover(
      @Nullable String awaitedInstanceId, Consumer<List<DiscoveredServer>> callback) {
    new Thread(() -> callback.accept(searchOrNull(awaitedInstanceId)), TAG).start();
  }

  @Nullable
  private List<DiscoveredServer> searchOrNull(@Nullable String awaitedInstanceId) {
    try {
      return search(awaitedInstanceId);
    } catch (IOException | SecurityException e) {
      Log.w(TAG, "Kolibri server discovery failed", e);
      return null;
    }
  }

  private List<DiscoveredServer> search(@Nullable String awaitedInstanceId) throws IOException {
    WifiManager.MulticastLock lock = acquireMulticastLock();
    try (MulticastSocket socket = new MulticastSocket(group.getPort())) {
      return new Search(socket, awaitedInstanceId).run(interfaces.get());
    } finally {
      if (lock != null) {
        lock.release();
      }
    }
  }

  @Nullable
  private WifiManager.MulticastLock acquireMulticastLock() {
    WifiManager wifi = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
    if (wifi == null) {
      return null;
    }
    WifiManager.MulticastLock lock = wifi.createMulticastLock(TAG);
    lock.acquire();
    return lock;
  }

  private static String key(String name) {
    return name.toLowerCase(Locale.ROOT);
  }

  private static final class Service {
    private final MdnsMessage.Record record;
    private final String source;

    Service(MdnsMessage.Record record, String source) {
      this.record = record;
      this.source = source;
    }
  }

  private final class Search {
    private final MulticastSocket socket;
    @Nullable private final String awaitedInstanceId;
    private final Collection<String> ownAddresses = ServerDiscovery.this.ownAddresses.get();
    private final List<NetworkInterface> joinedInterfaces = new ArrayList<>();
    private final Map<String, String> instances = new LinkedHashMap<>();
    private final Map<String, Service> services = new HashMap<>();
    private final Map<String, Map<String, String>> texts = new HashMap<>();
    private final Map<String, String> addresses = new HashMap<>();

    Search(MulticastSocket socket, @Nullable String awaitedInstanceId) {
      this.socket = socket;
      this.awaitedInstanceId = awaitedInstanceId;
    }

    List<DiscoveredServer> run(List<NetworkInterface> activeInterfaces) throws IOException {
      for (NetworkInterface networkInterface : activeInterfaces) {
        try {
          socket.joinGroup(group, networkInterface);
          joinedInterfaces.add(networkInterface);
        } catch (IOException e) {
          Log.w(TAG, "Could not search on " + networkInterface.getName(), e);
        }
      }
      if (activeInterfaces.isEmpty()) {
        return Collections.emptyList();
      }
      if (joinedInterfaces.isEmpty()) {
        throw new IOException("Could not search on any interface");
      }
      byte[] buffer = new byte[MAX_PACKET_SIZE];
      long start = System.nanoTime();
      int queriesSent = 0;
      while (true) {
        long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        if (elapsed >= DISCOVERY_WINDOW_MS) {
          return servers();
        }
        long nextQueryAt = queriesSent * QUERY_INTERVAL_MS;
        if (elapsed >= nextQueryAt) {
          send(MdnsMessage.query(SERVICE_NAME, MdnsMessage.TYPE_PTR));
          queryUnresolvedInstances();
          queriesSent++;
          continue;
        }
        long wakeAt = Math.min(DISCOVERY_WINDOW_MS, nextQueryAt);
        socket.setSoTimeout((int) Math.max(1, wakeAt - elapsed));
        DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
        try {
          socket.receive(packet);
        } catch (SocketTimeoutException e) {
          continue;
        }
        handle(packet);
        if (awaitedInstanceId != null) {
          List<DiscoveredServer> found = servers();
          if (contains(found, awaitedInstanceId)) {
            return found;
          }
        }
      }
    }

    private void send(byte[] data) {
      DatagramPacket packet = new DatagramPacket(data, data.length, group);
      for (NetworkInterface networkInterface : joinedInterfaces) {
        try {
          socket.setNetworkInterface(networkInterface);
          socket.send(packet);
        } catch (IOException e) {
          Log.w(TAG, "Could not query on " + networkInterface.getName(), e);
        }
      }
    }

    private void queryInstance(String name) {
      send(MdnsMessage.query(name, MdnsMessage.TYPE_SRV, MdnsMessage.TYPE_TXT));
    }

    private void queryUnresolvedInstances() {
      for (Map.Entry<String, String> instance : instances.entrySet()) {
        if (!services.containsKey(instance.getKey()) || !texts.containsKey(instance.getKey())) {
          queryInstance(instance.getValue());
        }
      }
    }

    private void handle(DatagramPacket packet) {
      MdnsMessage message;
      try {
        message = MdnsMessage.parse(packet.getData(), packet.getLength());
      } catch (IllegalArgumentException e) {
        return;
      }
      if (!message.isResponse()) {
        return;
      }
      String source = packet.getAddress().getHostAddress();
      for (MdnsMessage.Record record : message.getRecords()) {
        String name = key(record.getName());
        switch (record.getType()) {
          case MdnsMessage.TYPE_PTR:
            if (name.equals(SERVICE_KEY)
                && instances.putIfAbsent(key(record.getTarget()), record.getTarget()) == null) {
              queryInstance(record.getTarget());
            }
            break;
          case MdnsMessage.TYPE_SRV:
            services.putIfAbsent(name, new Service(record, source));
            break;
          case MdnsMessage.TYPE_TXT:
            texts.putIfAbsent(name, record.getTxt());
            break;
          case MdnsMessage.TYPE_A:
            addresses.putIfAbsent(name, record.getAddress());
            break;
          default:
            break;
        }
      }
    }

    private List<DiscoveredServer> servers() {
      List<DiscoveredServer> found = new ArrayList<>();
      for (String instance : instances.keySet()) {
        Service service = services.get(instance);
        Map<String, String> text = texts.get(instance);
        if (service == null || text == null) {
          continue;
        }
        String ip = addresses.getOrDefault(key(service.record.getTarget()), service.source);
        DiscoveredServer server = DiscoveredServer.fromTxt(text, ip, service.record.getPort());
        if (server != null) {
          found.add(server);
        }
      }
      return DiscoveredServer.eligible(found, ownAddresses);
    }

    private boolean contains(List<DiscoveredServer> found, String instanceId) {
      for (DiscoveredServer server : found) {
        if (server.getInstanceId().equals(instanceId)) {
          return true;
        }
      }
      return false;
    }
  }
}
