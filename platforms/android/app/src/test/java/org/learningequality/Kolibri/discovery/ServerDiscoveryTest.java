package org.learningequality.Kolibri.discovery;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.KITCHEN;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.KITCHEN_RESPONSE_WITHOUT_ADDRESS;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.LIBRARY;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.LIBRARY_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PRINTER;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PRINTER_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PTR_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.TABLET;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.TABLET_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.bytes;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class ServerDiscoveryTest {

  private InetSocketAddress group;
  private NetworkInterface loopback;
  private FakeResponder responder;

  @Before
  public void setUp() throws IOException {
    int port;
    try (DatagramSocket probe = new DatagramSocket(0)) {
      port = probe.getLocalPort();
    }
    group = new InetSocketAddress("224.0.0.251", port);
    loopback = NetworkInterface.getByInetAddress(InetAddress.getLoopbackAddress());
  }

  @After
  public void tearDown() {
    if (responder != null) {
      responder.close();
    }
  }

  private List<DiscoveredServer> discover(Collection<String> ownAddresses) throws Exception {
    return discover(Collections.singletonList(loopback), ownAddresses, null);
  }

  private List<DiscoveredServer> discover(
      List<NetworkInterface> interfaces, Collection<String> ownAddresses, String awaitedInstanceId)
      throws Exception {
    return discover(
        new ServerDiscovery(
            RuntimeEnvironment.getApplication(), group, () -> interfaces, () -> ownAddresses),
        awaitedInstanceId);
  }

  private static List<DiscoveredServer> discover(
      ServerDiscovery discovery, String awaitedInstanceId) throws Exception {
    CountDownLatch done = new CountDownLatch(1);
    AtomicReference<List<DiscoveredServer>> result = new AtomicReference<>();
    AtomicReference<Thread> callbackThread = new AtomicReference<>();

    discovery.discover(
        awaitedInstanceId,
        servers -> {
          callbackThread.set(Thread.currentThread());
          result.set(servers);
          done.countDown();
        });

    assertTrue("discovery never called back", done.await(10, TimeUnit.SECONDS));
    assertNotSame(Thread.currentThread(), callbackThread.get());
    return result.get();
  }

  private static List<String> baseUrls(List<DiscoveredServer> servers) {
    List<String> urls = new ArrayList<>();
    for (DiscoveredServer server : servers) {
      urls.add(server.getBaseUrl());
    }
    return urls;
  }

  @Test
  public void discover_reportsEachFullKolibriServerThatAnswered() throws Exception {
    responder = new FakeResponder(group, loopback, 0);

    List<DiscoveredServer> servers = discover(Collections.emptyList());

    assertEquals(
        Arrays.asList("http://192.168.1.20:8080/kolibri/", "http://127.0.0.1:8080/"),
        baseUrls(servers));
    assertEquals("library", servers.get(0).getInstanceId());
    assertEquals("Kitchen", servers.get(1).getDeviceName());
  }

  @Test
  public void discover_findsAServerThatMissedTheFirstQuery() throws Exception {
    responder = new FakeResponder(group, loopback, 1);

    List<DiscoveredServer> servers = discover(Collections.emptyList());

    assertEquals(
        Arrays.asList("http://192.168.1.20:8080/kolibri/", "http://127.0.0.1:8080/"),
        baseUrls(servers));
  }

  @Test
  public void discover_leavesOutThisDevicesOwnServer() throws Exception {
    responder = new FakeResponder(group, loopback, 0);

    List<DiscoveredServer> servers = discover(Collections.singletonList("192.168.1.20"));

    assertEquals(Collections.singletonList("http://127.0.0.1:8080/"), baseUrls(servers));
  }

  @Test
  public void discover_findsAServerWhoseFirstInstanceReplyWasLost() throws Exception {
    responder = new FakeResponder(group, loopback, 0);
    responder.dropFirstInstanceReply(LIBRARY);

    List<DiscoveredServer> servers = discover(Collections.emptyList());

    assertEquals(
        Arrays.asList("http://192.168.1.20:8080/kolibri/", "http://127.0.0.1:8080/"),
        baseUrls(servers));
  }

  @Test
  public void discover_findsServersOnTheInterfacesThatCouldJoin() throws Exception {
    responder = new FakeResponder(group, loopback, 0);

    List<DiscoveredServer> servers =
        discover(Arrays.asList(loopback, loopback), Collections.emptyList(), null);

    assertEquals(
        Arrays.asList("http://192.168.1.20:8080/kolibri/", "http://127.0.0.1:8080/"),
        baseUrls(servers));
  }

  @Test
  public void discover_reportsASearchThatCouldNotRunWhenThePortIsTaken() throws Exception {
    try (DatagramSocket holder = new DatagramSocket(group.getPort())) {
      assertNull(discover(Collections.singletonList(loopback), Collections.emptyList(), null));
    }
  }

  @Test
  public void discover_callsBackAtOnceWhenNoInterfaceCanSearch() throws Exception {
    responder = new FakeResponder(group, loopback, 0);
    long start = System.nanoTime();

    List<DiscoveredServer> servers =
        discover(Collections.emptyList(), Collections.emptyList(), "kitchen");

    assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start) < 1500);
    assertEquals(Collections.emptyList(), servers);
  }

  @Test
  public void discover_callsBackAsSoonAsTheAwaitedServerIsFound() throws Exception {
    responder = new FakeResponder(group, loopback, 0);
    long start = System.nanoTime();

    List<DiscoveredServer> servers =
        discover(Collections.singletonList(loopback), Collections.emptyList(), "kitchen");

    assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start) < 1500);
    assertTrue(baseUrls(servers).contains("http://127.0.0.1:8080/"));
  }

  /** Answers the way a zeroconf 0.19.17 host serving four instances does. */
  private static final class FakeResponder implements AutoCloseable {
    private static final Map<String, String> INSTANCE_RESPONSES = new HashMap<>();

    static {
      INSTANCE_RESPONSES.put(LIBRARY, LIBRARY_RESPONSE);
      INSTANCE_RESPONSES.put(KITCHEN, KITCHEN_RESPONSE_WITHOUT_ADDRESS);
      INSTANCE_RESPONSES.put(TABLET, TABLET_RESPONSE);
      INSTANCE_RESPONSES.put(PRINTER, PRINTER_RESPONSE);
    }

    private final MulticastSocket socket;
    private final InetSocketAddress group;
    private final Thread thread;
    private int pointerQueriesToIgnore;
    private final Set<String> instanceRepliesToDrop = ConcurrentHashMap.newKeySet();

    FakeResponder(InetSocketAddress group, NetworkInterface loopback, int pointerQueriesToIgnore)
        throws IOException {
      this.group = group;
      this.pointerQueriesToIgnore = pointerQueriesToIgnore;
      socket = new MulticastSocket(group.getPort());
      socket.joinGroup(group, loopback);
      socket.setNetworkInterface(loopback);
      thread = new Thread(this::serve);
      thread.start();
    }

    void dropFirstInstanceReply(String instance) {
      instanceRepliesToDrop.add(instance);
    }

    private void serve() {
      byte[] buffer = new byte[9000];
      while (!socket.isClosed()) {
        DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
        try {
          socket.receive(packet);
          MdnsMessage message = MdnsMessage.parse(packet.getData(), packet.getLength());
          if (!message.isResponse() && !message.getQuestions().isEmpty()) {
            answer(message.getQuestions().get(0));
          }
        } catch (IllegalArgumentException ignored) {
        } catch (SocketException closed) {
          return;
        } catch (IOException e) {
          throw new RuntimeException(e);
        }
      }
    }

    private void answer(MdnsMessage.Question question) throws IOException {
      String response;
      if (question.getType() == MdnsMessage.TYPE_PTR) {
        if (pointerQueriesToIgnore > 0) {
          pointerQueriesToIgnore--;
          return;
        }
        response = PTR_RESPONSE;
      } else if (instanceRepliesToDrop.remove(question.getName())) {
        return;
      } else {
        response = INSTANCE_RESPONSES.get(question.getName());
      }
      if (response == null) {
        return;
      }
      byte[] data = bytes(response);
      socket.send(new DatagramPacket(data, data.length, group));
    }

    @Override
    public void close() {
      socket.close();
      try {
        thread.join(1000);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }
  }
}
