package org.learningequality.Kolibri.discovery;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.annotation.VisibleForTesting;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.learningequality.Kolibri.util.NetworkUtils;

public class ServerDiscovery {

  private static final String TAG = "KolibriServerDiscovery";

  static final String SERVICE_TYPE = "_kolibri._tcp";
  private static final long DISCOVERY_WINDOW_MS = 3000;
  private static final long RESOLVE_TIMEOUT_MS = 1000;

  private static volatile ServerDiscovery instance;

  @VisibleForTesting
  interface Nsd {
    void discoverServices(String serviceType, NsdManager.DiscoveryListener listener);

    void stopServiceDiscovery(NsdManager.DiscoveryListener listener);

    void resolveService(NsdServiceInfo service, NsdManager.ResolveListener listener);

    /**
     * @return {@code false} below API 34, which cannot stop a resolve and, until it answers, fails
     *     every other resolve with {@code FAILURE_ALREADY_ACTIVE}
     */
    boolean resolvesConcurrently();

    void stopServiceResolution(NsdManager.ResolveListener listener);
  }

  public interface Watch {
    void stop();
  }

  private final Nsd nsd;
  private final Supplier<Collection<String>> ownAddresses;
  private final long windowMs;
  private final long resolveTimeoutMs;
  private final ScheduledExecutorService executor;
  private final Set<Browse> browses = new HashSet<>();
  private final Map<String, NsdServiceInfo> unresolved = new LinkedHashMap<>();
  private final Map<String, NsdServiceInfo> resolvedServices = new HashMap<>();
  private final Map<String, Resolution> resolutions = new HashMap<>();
  @Nullable private Resolution resolving;

  @VisibleForTesting
  ServerDiscovery(
      Nsd nsd, Supplier<Collection<String>> ownAddresses, long windowMs, long resolveTimeoutMs) {
    this.nsd = nsd;
    this.ownAddresses = ownAddresses;
    this.windowMs = windowMs;
    this.resolveTimeoutMs = resolveTimeoutMs;
    executor =
        Executors.newSingleThreadScheduledExecutor(
            runnable -> {
              Thread thread = new Thread(runnable, TAG);
              thread.setDaemon(true);
              return thread;
            });
  }

  public static ServerDiscovery getInstance(Context context) {
    if (instance == null) {
      synchronized (ServerDiscovery.class) {
        if (instance == null) {
          instance =
              new ServerDiscovery(
                  systemNsd(context.getApplicationContext().getSystemService(NsdManager.class)),
                  NetworkUtils::getActiveIPv4Addresses,
                  DISCOVERY_WINDOW_MS,
                  RESOLVE_TIMEOUT_MS);
        }
      }
    }
    return instance;
  }

  @VisibleForTesting
  public static void setInstanceForTesting(ServerDiscovery discovery) {
    instance = discovery;
  }

  private static Nsd systemNsd(NsdManager manager) {
    return new Nsd() {
      @Override
      public void discoverServices(String serviceType, NsdManager.DiscoveryListener listener) {
        manager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener);
      }

      @Override
      public void stopServiceDiscovery(NsdManager.DiscoveryListener listener) {
        manager.stopServiceDiscovery(listener);
      }

      @Override
      public void resolveService(NsdServiceInfo service, NsdManager.ResolveListener listener) {
        manager.resolveService(service, listener);
      }

      @Override
      public boolean resolvesConcurrently() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE;
      }

      @Override
      public void stopServiceResolution(NsdManager.ResolveListener listener) {
        manager.stopServiceResolution(listener);
      }
    };
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
    executor.execute(() -> new Search(awaitedInstanceId, callback).start());
  }

  /**
   * Calls back, off the UI thread, with the eligible servers nearby each time they change, until
   * stopped; with none, once the first discovery window closes.
   */
  public Watch watch(Consumer<List<DiscoveredServer>> onChange) {
    Browse browse = new Browse(onChange, () -> {});
    executor.execute(browse::start);
    ScheduledFuture<?> silentReport =
        executor.schedule(browse::reportIfSilent, windowMs, TimeUnit.MILLISECONDS);
    return () -> {
      silentReport.cancel(false);
      executor.execute(browse::stop);
    };
  }

  private final class Resolution implements NsdManager.ResolveListener {
    final NsdServiceInfo service;
    private ScheduledFuture<?> timeout;
    private boolean released;

    Resolution(NsdServiceInfo service) {
      this.service = service;
    }

    String name() {
      return service.getServiceName();
    }

    void start() {
      resolving = this;
      resolutions.put(name(), this);
      timeout = executor.schedule(this::onTimedOut, resolveTimeoutMs, TimeUnit.MILLISECONDS);
      nsd.resolveService(service, this);
    }

    @Override
    public void onServiceResolved(NsdServiceInfo resolved) {
      executor.execute(
          () -> {
            if (isWanted(name())) {
              resolvedServices.put(name(), resolved);
              executor.schedule(
                  () -> resolvedServices.remove(name(), resolved), windowMs, TimeUnit.MILLISECONDS);
            }
            release();
            for (Browse browse : new ArrayList<>(browses)) {
              browse.onResolved(resolved);
            }
          });
    }

    @Override
    public void onResolveFailed(NsdServiceInfo failed, int errorCode) {
      executor.execute(
          () -> {
            Log.w(TAG, "Could not resolve " + name() + ": error " + errorCode);
            retry(service);
            release();
          });
    }

    private void onTimedOut() {
      if (nsd.resolvesConcurrently()) {
        Log.w(TAG, "Resolving the next service beside " + name());
        freeSlot();
      } else {
        Log.w(TAG, "Still waiting to resolve " + name());
      }
    }

    void stopIfUnwanted() {
      if (!isWanted(name())) {
        try {
          nsd.stopServiceResolution(this);
        } catch (RuntimeException e) {
          Log.w(TAG, "Could not stop resolving " + name(), e);
        }
        release();
      }
    }

    private void release() {
      timeout.cancel(false);
      if (!released) {
        released = true;
        resolutions.remove(name(), this);
        freeSlot();
      }
    }

    private void freeSlot() {
      if (resolving == this) {
        resolving = null;
        resolveNext();
      }
    }
  }

  private void stopUnwantedResolutions() {
    if (nsd.resolvesConcurrently()) {
      for (Resolution resolution : new ArrayList<>(resolutions.values())) {
        resolution.stopIfUnwanted();
      }
    }
  }

  private boolean isWanted(String name) {
    for (Browse browse : browses) {
      if (browse.isPresent(name)) {
        return true;
      }
    }
    return false;
  }

  private void request(NsdServiceInfo service) {
    String name = service.getServiceName();
    if (resolvedServices.containsKey(name) || resolutions.containsKey(name)) {
      return;
    }
    unresolved.putIfAbsent(name, service);
    resolveNext();
  }

  private void retry(NsdServiceInfo service) {
    executor.schedule(() -> request(service), windowMs, TimeUnit.MILLISECONDS);
  }

  private void resolveNext() {
    Iterator<NsdServiceInfo> pending = unresolved.values().iterator();
    while (resolving == null && pending.hasNext()) {
      NsdServiceInfo next = pending.next();
      pending.remove();
      if (isWanted(next.getServiceName())) {
        new Resolution(next).start();
      }
    }
  }

  private final class Search {
    @Nullable private final String awaitedInstanceId;
    private final Consumer<List<DiscoveredServer>> callback;
    private final Browse browse;
    private boolean done;

    Search(@Nullable String awaitedInstanceId, Consumer<List<DiscoveredServer>> callback) {
      this.awaitedInstanceId = awaitedInstanceId;
      this.callback = callback;
      browse = new Browse(this::onChange, () -> finish(null));
    }

    void start() {
      executor.schedule(() -> finish(browse.servers()), windowMs, TimeUnit.MILLISECONDS);
      browse.start();
    }

    private void onChange(List<DiscoveredServer> found) {
      if (awaitedInstanceId == null) {
        return;
      }
      for (DiscoveredServer server : found) {
        if (server.getInstanceId().equals(awaitedInstanceId)) {
          finish(found);
          return;
        }
      }
    }

    private void finish(@Nullable List<DiscoveredServer> found) {
      if (done) {
        return;
      }
      done = true;
      browse.stop();
      callback.accept(found);
    }
  }

  private final class Browse implements NsdManager.DiscoveryListener {
    private final Consumer<List<DiscoveredServer>> onChange;
    private final Runnable onFailed;
    private final Set<String> present = new HashSet<>();
    private final Map<String, DiscoveredServer> resolved = new LinkedHashMap<>();
    private List<DiscoveredServer> servers = Collections.emptyList();
    private boolean reported;
    private boolean started;
    private boolean stopped;

    Browse(Consumer<List<DiscoveredServer>> onChange, Runnable onFailed) {
      this.onChange = onChange;
      this.onFailed = onFailed;
    }

    void start() {
      if (stopped) {
        return;
      }
      try {
        nsd.discoverServices(SERVICE_TYPE, this);
        started = true;
        browses.add(this);
      } catch (RuntimeException e) {
        Log.w(TAG, "Could not look for Kolibri servers", e);
        stopped = true;
        onFailed.run();
      }
    }

    void stop() {
      if (stopped) {
        return;
      }
      markStopped();
      if (started) {
        try {
          nsd.stopServiceDiscovery(this);
        } catch (RuntimeException e) {
          Log.w(TAG, "Could not stop looking for Kolibri servers", e);
        }
      }
    }

    private void markStopped() {
      stopped = true;
      browses.remove(this);
      if (browses.isEmpty()) {
        resolvedServices.clear();
      }
      stopUnwantedResolutions();
    }

    List<DiscoveredServer> servers() {
      return servers;
    }

    boolean isPresent(String name) {
      return present.contains(name);
    }

    @Override
    public void onStartDiscoveryFailed(String serviceType, int errorCode) {
      executor.execute(
          () -> {
            Log.w(TAG, "Could not look for Kolibri servers: error " + errorCode);
            started = false;
            if (!stopped) {
              markStopped();
              onFailed.run();
            }
          });
    }

    @Override
    public void onStopDiscoveryFailed(String serviceType, int errorCode) {
      Log.w(TAG, "Could not stop looking for Kolibri servers: error " + errorCode);
    }

    @Override
    public void onDiscoveryStarted(String serviceType) {}

    @Override
    public void onDiscoveryStopped(String serviceType) {}

    @Override
    public void onServiceFound(NsdServiceInfo service) {
      executor.execute(
          () -> {
            String name = service.getServiceName();
            if (stopped || !present.add(name)) {
              return;
            }
            NsdServiceInfo known = resolvedServices.get(name);
            if (known == null) {
              request(service);
            } else {
              onResolved(known);
            }
          });
    }

    @Override
    public void onServiceLost(NsdServiceInfo service) {
      executor.execute(
          () -> {
            String name = service.getServiceName();
            present.remove(name);
            resolvedServices.remove(name);
            stopUnwantedResolutions();
            if (resolved.remove(name) != null) {
              publish();
            }
          });
    }

    void onResolved(NsdServiceInfo service) {
      DiscoveredServer server = toServer(service);
      if (!stopped && server != null && present.contains(service.getServiceName())) {
        resolved.put(service.getServiceName(), server);
        publish();
      }
    }

    private void publish() {
      List<DiscoveredServer> eligible =
          DiscoveredServer.eligible(resolved.values(), ownAddresses.get());
      if (!eligible.equals(servers)) {
        servers = eligible;
        reported = true;
        onChange.accept(eligible);
      }
    }

    void reportIfSilent() {
      if (!stopped && !reported) {
        onChange.accept(servers);
      }
    }
  }

  @Nullable
  private static DiscoveredServer toServer(NsdServiceInfo service) {
    String ip = ipv4Address(service);
    if (ip == null) {
      return null;
    }
    Map<String, String> txt = new HashMap<>();
    for (Map.Entry<String, byte[]> attribute : service.getAttributes().entrySet()) {
      if (attribute.getValue() != null) {
        txt.put(attribute.getKey(), new String(attribute.getValue(), StandardCharsets.UTF_8));
      }
    }
    return DiscoveredServer.fromTxt(txt, ip, service.getPort());
  }

  @Nullable
  private static String ipv4Address(NsdServiceInfo service) {
    List<InetAddress> addresses =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
            ? service.getHostAddresses()
            : Collections.singletonList(service.getHost());
    for (InetAddress address : addresses) {
      if (address instanceof Inet4Address) {
        return address.getHostAddress();
      }
    }
    return null;
  }
}
