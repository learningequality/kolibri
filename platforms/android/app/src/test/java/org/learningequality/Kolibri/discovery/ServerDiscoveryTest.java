package org.learningequality.Kolibri.discovery;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
public class ServerDiscoveryTest {

  private static final long LONG_WINDOW_MS = TimeUnit.MINUTES.toMillis(1);
  private static final long SHORT_WINDOW_MS = 200;
  private static final long ONE_SECOND_WINDOW_MS = 1000;
  private static final long TIMEOUT_S = 5;

  private static final String LIBRARY_IP = "192.168.1.20";
  private static final String LAB_IP = "192.168.1.30";
  private static final String MOVED_LAB_IP = "192.168.1.31";
  private static final String OWN_IP = "192.168.1.40";
  private static final DiscoveredServer LAB = DiscoveredServers.server("def", "Lab", LAB_IP);

  private final FakeNsd nsd = new FakeNsd();

  @Test
  public void discover_reportsEachFullKolibriServerResolved() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    nsd.awaitResolve().resolve(kolibri("library", "abc", "Library", LIBRARY_IP));
    browse.find("soud");
    nsd.awaitResolve().resolve(soud("soud", "ghi", "Tablet", "192.168.1.50"));
    browse.find("printer");
    nsd.awaitResolve().resolve(service("printer", "192.168.1.60"));
    browse.find("lab");
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));

    assertEquals(
        Arrays.asList(
            DiscoveredServers.server("abc", "Library", LIBRARY_IP),
            LAB),
        result.await());
    assertEquals("_kolibri._tcp", browse.serviceType);
  }

  @Test
  public void discover_leavesOutThisDevicesOwnServer() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("own");
    nsd.awaitResolve().resolve(kolibri("own", "xyz", "This tablet", OWN_IP));
    findLab(browse);

    assertEquals(Collections.singletonList(LAB), result.await());
  }

  @Test
  public void discover_reachesAServerAtItsIPv4Address() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    nsd.awaitBrowse().find("lab");
    NsdServiceInfo lab = kolibri("lab", "def", "Lab", LAB_IP);
    lab.setHostAddresses(
        Arrays.asList(InetAddress.getByName("fe80::1"), InetAddress.getByName(LAB_IP)));
    nsd.awaitResolve().resolve(lab);

    assertEquals(Collections.singletonList(LAB), result.await());
  }

  @Test
  public void discover_resolvesOneServiceAtATime() throws Exception {
    discover(LONG_WINDOW_MS, null);
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    browse.find("lab");
    Resolve first = nsd.awaitResolve();

    assertNull(nsd.resolves.poll(SHORT_WINDOW_MS, TimeUnit.MILLISECONDS));

    first.resolve(kolibri("library", "abc", "Library", LIBRARY_IP));

    assertEquals("lab", nsd.awaitResolve().service.getServiceName());
  }

  @Test
  public void aSearchAndAWatchShareEachResolve() throws Exception {
    ServerDiscovery discovery = discovery(LONG_WINDOW_MS);
    discovery.watch(servers -> {});
    DiscoveryListener watch = nsd.awaitBrowse();
    Result result = new Result();
    discovery.discover("abc", result::accept);
    DiscoveryListener search = nsd.awaitBrowse();
    watch.find("library");
    search.find("library");

    nsd.awaitResolve().resolve(kolibri("library", "abc", "Library", LIBRARY_IP));

    assertEquals(
        Collections.singletonList(DiscoveredServers.server("abc", "Library", LIBRARY_IP)),
        result.await());
    assertNull(nsd.resolves.poll(SHORT_WINDOW_MS, TimeUnit.MILLISECONDS));
  }

  @Test
  public void discover_findsAtOnceAServerAWatchAlreadyResolved() throws Exception {
    ServerDiscovery discovery = discovery(LONG_WINDOW_MS);
    discovery.watch(servers -> {});
    findLab(nsd.awaitBrowse());
    Result result = new Result();
    discovery.discover("def", result::accept);

    nsd.awaitBrowse().find("lab");

    assertEquals(Collections.singletonList(LAB), result.await());
    assertNull(nsd.resolves.poll(SHORT_WINDOW_MS, TimeUnit.MILLISECONDS));
  }

  @Test
  public void discover_resolvesAgainAServerAWatchResolvedLongerAgoThanAWindow() throws Exception {
    ServerDiscovery discovery = discovery(ONE_SECOND_WINDOW_MS);
    discovery.watch(servers -> {});
    findLab(nsd.awaitBrowse());
    Thread.sleep(2 * ONE_SECOND_WINDOW_MS);
    Result result = new Result();
    discovery.discover("def", result::accept);

    nsd.awaitBrowse().find("lab");
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", MOVED_LAB_IP));

    assertEquals(
        Collections.singletonList(DiscoveredServers.server("def", "Lab", MOVED_LAB_IP)),
        result.await());
  }

  @Test
  public void discover_goesOnResolvingAfterAResolveFails() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    browse.find("lab");
    nsd.awaitResolve().fail();
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));

    assertEquals(Collections.singletonList(LAB), result.await());
  }

  @Test
  public void discover_leavesOutAServiceLostBeforeItResolved() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    Resolve resolve = nsd.awaitResolve();
    browse.lose("library");
    resolve.resolve(kolibri("library", "abc", "Library", LIBRARY_IP));
    findLab(browse);

    assertEquals(Collections.singletonList(LAB), result.await());
  }

  @Test
  @Config(sdk = Build.VERSION_CODES.TIRAMISU)
  public void discover_leavesOutAServiceLostWhileThePlatformStillResolvesIt() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    Resolve resolve = nsd.awaitResolve();
    browse.lose("library");
    resolve.resolve(kolibri("library", "abc", "Library", LIBRARY_IP));
    findLab(browse);

    assertEquals(Collections.singletonList(LAB), result.await());
  }

  @Test
  public void watch_resolvesAgainAServerFoundAgainAfterItWasLost() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(LONG_WINDOW_MS).watch(changes::add);
    DiscoveryListener browse = nsd.awaitBrowse();
    findLab(browse);
    assertEquals(Collections.singletonList(LAB), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
    browse.lose("lab");
    assertEquals(Collections.emptyList(), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));

    browse.find("lab");
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", MOVED_LAB_IP));

    assertEquals(
        Collections.singletonList(DiscoveredServers.server("def", "Lab", MOVED_LAB_IP)),
        changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
  }

  @Test
  public void discover_reportsASearchThatCouldNotStart() throws Exception {
    Result result = discover(LONG_WINDOW_MS, null);

    nsd.awaitBrowse().listener.onStartDiscoveryFailed(
        ServerDiscovery.SERVICE_TYPE, NsdManager.FAILURE_INTERNAL_ERROR);

    assertNull(result.await());
  }

  @Test
  public void discover_callsBackAsSoonAsTheAwaitedServerIsFound() throws Exception {
    Result result = discover(LONG_WINDOW_MS, "def");
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("library");
    nsd.awaitResolve().resolve(kolibri("library", "abc", "Library", LIBRARY_IP));
    browse.find("lab");
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));

    assertEquals(
        Arrays.asList(
            DiscoveredServers.server("abc", "Library", LIBRARY_IP),
            LAB),
        result.await());
    assertSame(browse.listener, nsd.awaitStopped());
  }

  @Test
  public void discover_resolvesAgainTheAwaitedServerOfAnEarlierSearch() throws Exception {
    ServerDiscovery discovery = discovery(LONG_WINDOW_MS);
    Result first = new Result();
    discovery.discover("def", first::accept);
    findLab(nsd.awaitBrowse());
    assertEquals(Collections.singletonList(LAB), first.await());
    Result second = new Result();
    discovery.discover("def", second::accept);

    findLab(nsd.awaitBrowse());

    assertEquals(Collections.singletonList(LAB), second.await());
  }

  @Test
  public void watch_dropsALostServerWhileAFinishedResolveAwaitsDelivery() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(LONG_WINDOW_MS).watch(changes::add);
    DiscoveryListener browse = nsd.awaitBrowse();
    findLab(browse);
    assertEquals(Collections.singletonList(LAB), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
    browse.find("gone");
    nsd.end(nsd.awaitResolve());

    browse.lose("gone");
    browse.lose("lab");

    assertEquals(Collections.emptyList(), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
  }

  @Test
  public void discover_stopsLookingOnceTheWindowCloses() throws Exception {
    Result result = discover(SHORT_WINDOW_MS, null);
    DiscoveryListener browse = nsd.awaitBrowse();

    assertEquals(Collections.emptyList(), result.await());
    assertSame(browse.listener, nsd.awaitStopped());
  }

  @Test
  public void watch_reportsServersAsTheyComeAndGo() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    ServerDiscovery.Watch watch = discovery(LONG_WINDOW_MS).watch(changes::add);
    DiscoveryListener browse = nsd.awaitBrowse();

    browse.find("library");
    nsd.awaitResolve().resolve(kolibri("library", "abc", "Library", LIBRARY_IP));
    assertEquals(
        Collections.singletonList(DiscoveredServers.server("abc", "Library", LIBRARY_IP)),
        changes.poll(TIMEOUT_S, TimeUnit.SECONDS));

    browse.lose("library");
    assertEquals(Collections.emptyList(), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));

    watch.stop();
    assertSame(browse.listener, nsd.awaitStopped());
  }

  @Test
  public void watch_resolvesTheNextServiceBesideASlowOne() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(LONG_WINDOW_MS, SHORT_WINDOW_MS).watch(changes::add);
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("slow");
    Resolve slow = nsd.awaitResolve();
    browse.find("lab");

    Resolve next = nsd.awaitResolve();

    assertEquals("lab", next.service.getServiceName());
    next.resolve(kolibri("lab", "def", "Lab", LAB_IP));
    assertEquals(Collections.singletonList(LAB), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
    slow.resolve(kolibri("slow", "abc", "Library", LIBRARY_IP));
    assertEquals(
        Arrays.asList(LAB, DiscoveredServers.server("abc", "Library", LIBRARY_IP)),
        changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
  }

  @Test
  public void watch_stopsResolvingAServiceOnceItIsLost() throws Exception {
    discovery(LONG_WINDOW_MS, SHORT_WINDOW_MS).watch(servers -> {});
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("gone");
    Resolve gone = nsd.awaitResolve();
    Thread.sleep(3 * SHORT_WINDOW_MS);

    browse.lose("gone");

    assertSame(gone.listener, nsd.awaitStoppedResolve());
  }

  @Test
  public void discover_stopsTheResolvesLeftWhenTheWindowCloses() throws Exception {
    discovery(ONE_SECOND_WINDOW_MS, LONG_WINDOW_MS).discover(null, servers -> {});
    nsd.awaitBrowse().find("gone");

    assertSame(nsd.awaitResolve().listener, nsd.awaitStoppedResolve());
  }

  @Test
  @Config(sdk = Build.VERSION_CODES.TIRAMISU)
  public void watch_waitsForAResolveThePlatformCannotStop() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(LONG_WINDOW_MS, SHORT_WINDOW_MS).watch(changes::add);
    DiscoveryListener browse = nsd.awaitBrowse();
    browse.find("slow");
    Resolve slow = nsd.awaitResolve();
    browse.find("lab");

    assertNull(nsd.resolves.poll(3 * SHORT_WINDOW_MS, TimeUnit.MILLISECONDS));

    slow.resolve(kolibri("slow", "abc", "Library", LIBRARY_IP));
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));

    changes.poll(TIMEOUT_S, TimeUnit.SECONDS);
    assertEquals(
        Arrays.asList(DiscoveredServers.server("abc", "Library", LIBRARY_IP), LAB),
        changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
  }

  @Test
  public void watch_reportsNoServersOnceTheWindowClosesWithNoneFound() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(SHORT_WINDOW_MS).watch(changes::add);

    assertEquals(Collections.emptyList(), changes.poll(TIMEOUT_S, TimeUnit.SECONDS));
  }

  @Test
  public void watch_resolvesAgainAServiceWhoseResolveFailed() throws Exception {
    BlockingQueue<List<DiscoveredServer>> changes = new LinkedBlockingQueue<>();
    discovery(SHORT_WINDOW_MS).watch(changes::add);
    nsd.awaitBrowse().find("lab");
    nsd.awaitResolve().fail();

    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));

    assertEquals(Collections.singletonList(LAB), nextServersFound(changes));
  }

  private static List<DiscoveredServer> nextServersFound(
      BlockingQueue<List<DiscoveredServer>> changes) throws InterruptedException {
    List<DiscoveredServer> change;
    do {
      change = changes.poll(TIMEOUT_S, TimeUnit.SECONDS);
    } while (change != null && change.isEmpty());
    return change;
  }

  private void findLab(DiscoveryListener browse) throws Exception {
    browse.find("lab");
    nsd.awaitResolve().resolve(kolibri("lab", "def", "Lab", LAB_IP));
  }

  private ServerDiscovery discovery(long windowMs) {
    return discovery(windowMs, windowMs);
  }

  private ServerDiscovery discovery(long windowMs, long resolveTimeoutMs) {
    return new ServerDiscovery(
        nsd, () -> Collections.singletonList(OWN_IP), windowMs, resolveTimeoutMs);
  }

  private Result discover(long windowMs, String awaitedInstanceId) {
    Result result = new Result();
    discovery(windowMs).discover(awaitedInstanceId, result::accept);
    return result;
  }

  private static NsdServiceInfo service(String name, String ip) throws UnknownHostException {
    NsdServiceInfo service = new NsdServiceInfo();
    service.setServiceName(name);
    service.setServiceType(ServerDiscovery.SERVICE_TYPE);
    service.setHost(InetAddress.getByName(ip));
    service.setPort(DiscoveredServers.PORT);
    return service;
  }

  private static NsdServiceInfo kolibri(String name, String instanceId, String deviceName, String ip)
      throws UnknownHostException {
    NsdServiceInfo service = service(name, ip);
    for (Map.Entry<String, String> entry :
        DiscoveredServers.kolibriTxt(instanceId, deviceName).entrySet()) {
      service.setAttribute(entry.getKey(), entry.getValue());
    }
    return service;
  }

  private static NsdServiceInfo soud(String name, String instanceId, String deviceName, String ip)
      throws UnknownHostException {
    NsdServiceInfo service = kolibri(name, instanceId, deviceName, ip);
    service.setAttribute("subset_of_users_device", "\"TRUE\"");
    return service;
  }

  private static final class Result {
    private final CountDownLatch done = new CountDownLatch(1);
    private final AtomicReference<List<DiscoveredServer>> found = new AtomicReference<>();

    void accept(List<DiscoveredServer> servers) {
      found.set(servers);
      done.countDown();
    }

    List<DiscoveredServer> await() throws InterruptedException {
      assertTrue("discovery called back", done.await(TIMEOUT_S, TimeUnit.SECONDS));
      return found.get();
    }
  }

  private static final class DiscoveryListener {
    final String serviceType;
    final NsdManager.DiscoveryListener listener;

    DiscoveryListener(String serviceType, NsdManager.DiscoveryListener listener) {
      this.serviceType = serviceType;
      this.listener = listener;
    }

    void find(String name) {
      listener.onServiceFound(unresolved(name));
    }

    void lose(String name) {
      listener.onServiceLost(unresolved(name));
    }

    private static NsdServiceInfo unresolved(String name) {
      NsdServiceInfo service = new NsdServiceInfo();
      service.setServiceName(name);
      service.setServiceType(ServerDiscovery.SERVICE_TYPE);
      return service;
    }
  }

  private final class Resolve {
    final NsdServiceInfo service;
    final NsdManager.ResolveListener listener;

    Resolve(NsdServiceInfo service, NsdManager.ResolveListener listener) {
      this.service = service;
      this.listener = listener;
    }

    void resolve(NsdServiceInfo resolved) {
      if (nsd.end(this)) {
        listener.onServiceResolved(resolved);
      }
    }

    void fail() {
      nsd.end(this);
      listener.onResolveFailed(service, NsdManager.FAILURE_INTERNAL_ERROR);
    }
  }

  private final class FakeNsd implements ServerDiscovery.Nsd {
    final BlockingQueue<DiscoveryListener> browses = new LinkedBlockingQueue<>();
    final BlockingQueue<NsdManager.DiscoveryListener> stopped = new LinkedBlockingQueue<>();
    final BlockingQueue<Resolve> resolves = new LinkedBlockingQueue<>();
    final BlockingQueue<NsdManager.ResolveListener> stoppedResolves = new LinkedBlockingQueue<>();
    private final Set<NsdManager.ResolveListener> stoppedListeners = new HashSet<>();
    private final Set<NsdManager.ResolveListener> endedListeners = new HashSet<>();
    private Resolve active;

    @Override
    public void discoverServices(String serviceType, NsdManager.DiscoveryListener listener) {
      browses.add(new DiscoveryListener(serviceType, listener));
    }

    @Override
    public void stopServiceDiscovery(NsdManager.DiscoveryListener listener) {
      stopped.add(listener);
    }

    @Override
    public synchronized void resolveService(
        NsdServiceInfo service, NsdManager.ResolveListener listener) {
      if (active != null && !resolvesConcurrently()) {
        listener.onResolveFailed(service, NsdManager.FAILURE_ALREADY_ACTIVE);
        return;
      }
      active = new Resolve(service, listener);
      resolves.add(active);
    }

    @Override
    public boolean resolvesConcurrently() {
      return Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE;
    }

    @Override
    public synchronized void stopServiceResolution(NsdManager.ResolveListener listener) {
      if (endedListeners.contains(listener)) {
        throw new IllegalArgumentException("listener not registered");
      }
      stoppedListeners.add(listener);
      stoppedResolves.add(listener);
    }

    /**
     * @return {@code false} when the resolve was stopped, as the platform then never answers it
     */
    synchronized boolean end(Resolve resolve) {
      if (active == resolve) {
        active = null;
      }
      endedListeners.add(resolve.listener);
      return !stoppedListeners.contains(resolve.listener);
    }

    DiscoveryListener awaitBrowse() throws InterruptedException {
      return await(browses);
    }

    Resolve awaitResolve() throws InterruptedException {
      return await(resolves);
    }

    NsdManager.DiscoveryListener awaitStopped() throws InterruptedException {
      return await(stopped);
    }

    NsdManager.ResolveListener awaitStoppedResolve() throws InterruptedException {
      return await(stoppedResolves);
    }

    private <T> T await(BlockingQueue<T> queue) throws InterruptedException {
      T item = queue.poll(TIMEOUT_S, TimeUnit.SECONDS);
      if (item == null) {
        throw new AssertionError("timed out");
      }
      return item;
    }
  }
}
