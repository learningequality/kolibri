package org.learningequality.Kolibri;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import java.util.concurrent.CompletableFuture;

/**
 * Background service that starts the Kolibri HTTP server
 *
 * <p>Server runs in background thread and signals readiness via ViewModel. Handles both local
 * WebView and remote peer connections.
 */
public class KolibriServerService extends Service {
  private static final String TAG = "KolibriServerService";
  private static final String MULTICAST_LOCK_TAG = "kolibri-mdns";

  private Thread serverThread;
  private CompletableFuture<Void> envInitFuture;
  @Nullable private WifiManager.MulticastLock multicastLock;

  @Override
  public void onCreate() {
    super.onCreate();
    Log.d(TAG, "KolibriServerService onCreate");

    // Ensure async init has been kicked off (returns the existing future if App
    // already started it)
    envInitFuture =
        KolibriEnvironmentManager.getInstance()
            .initializeAsync(new KolibriEnvironmentInitializer(this, false));

    // Required for zeroconf to receive mDNS announcements from peers on the local network.
    // Without this, the device can announce itself but won't discover others.
    acquireMulticastLock();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    // Runs on every startService() call; startHttpServer() is a no-op if already running
    startHttpServer();
    return START_NOT_STICKY;
  }

  private void acquireMulticastLock() {
    WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    if (wifi == null) {
      Log.w(TAG, "WifiManager unavailable; mDNS peer discovery will not work");
      return;
    }
    multicastLock = wifi.createMulticastLock(MULTICAST_LOCK_TAG);
    multicastLock.setReferenceCounted(false);
    multicastLock.acquire();
    Log.d(TAG, "Acquired WifiManager multicast lock for mDNS discovery");
  }

  private void releaseMulticastLock() {
    if (multicastLock != null && multicastLock.isHeld()) {
      multicastLock.release();
      Log.d(TAG, "Released WifiManager multicast lock");
    }
    multicastLock = null;
  }

  private synchronized void startHttpServer() {
    if (serverThread != null && serverThread.isAlive()) {
      Log.w(TAG, "Server already running");
      return;
    }

    serverThread =
        new Thread(
            () -> {
              try {
                Log.i(TAG, "Waiting for Kolibri environment initialization");
                envInitFuture.join();
                Log.i(TAG, "Starting Kolibri HTTP server");

                Python py = Python.getInstance();
                PyObject mainModule = py.getModule("main");

                // This blocks until server stops
                mainModule.callAttr("start_server");

                Log.i(TAG, "Kolibri HTTP server stopped");
              } catch (Exception e) {
                Log.e(TAG, "Error running Kolibri HTTP server", e);
              }
            },
            "KolibriServerThread");

    serverThread.start();
    Log.d(TAG, "HTTP server thread started");
  }

  @Override
  public synchronized void onDestroy() {
    super.onDestroy();
    Log.d(TAG, "KolibriServerService onDestroy");

    releaseMulticastLock();
    KolibriServerViewModel.getInstance().resetServerState();

    // Call Python to stop the server gracefully
    try {
      Python py = Python.getInstance();
      PyObject mainModule = py.getModule("main");
      mainModule.callAttr("stop_server");
      Log.d(TAG, "Called Python stop_server");
    } catch (Exception e) {
      Log.w(TAG, "Error calling stop_server (may already be stopped)", e);
    }

    if (serverThread != null && serverThread.isAlive()) {
      try {
        serverThread.join(5000);
        if (serverThread.isAlive()) {
          Log.w(TAG, "Server thread did not stop in time, interrupting");
          serverThread.interrupt();
        }
      } catch (InterruptedException e) {
        Log.w(TAG, "Interrupted waiting for server thread");
        Thread.currentThread().interrupt();
      }
    }

    serverThread = null;
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    // This is a started service, not a bound service
    return null;
  }
}
