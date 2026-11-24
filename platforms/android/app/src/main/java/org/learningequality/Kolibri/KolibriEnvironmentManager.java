package org.learningequality.Kolibri;

import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Coordinates one-time asynchronous initialization of the Kolibri environment.
 *
 * <p>Separates initialization coordination (this class) from the initialization work itself ({@link
 * KolibriEnvironmentInitializer}), similar to the BaseTaskWorker/TaskWorkerImpl split. The first
 * caller's initializer runs on a dedicated background thread; later callers get the same future. On
 * failure the process crashes on its main thread.
 */
public final class KolibriEnvironmentManager {
  private static final KolibriEnvironmentManager INSTANCE = new KolibriEnvironmentManager();

  private final AtomicReference<CompletableFuture<Void>> initFuture = new AtomicReference<>();

  // Package-private so tests can create isolated instances; production code uses the singleton.
  KolibriEnvironmentManager() {}

  public static KolibriEnvironmentManager getInstance() {
    return INSTANCE;
  }

  /**
   * Kick off initialization on a background thread if it hasn't started already. Must not block the
   * caller: main-thread callers (App.onCreate, Service.onCreate) rely on this returning immediately
   * even while initialization is in progress.
   *
   * @return the future for the in-flight (or completed) initialization
   */
  public CompletableFuture<Void> initializeAsync(KolibriEnvironmentInitializer initializer) {
    while (true) {
      CompletableFuture<Void> existing = initFuture.get();
      if (existing != null) {
        return existing;
      }
      CompletableFuture<Void> candidate = new CompletableFuture<>();
      if (initFuture.compareAndSet(null, candidate)) {
        new Thread(
                () -> {
                  try {
                    initializer.initialize();
                    candidate.complete(null);
                  } catch (Throwable t) {
                    // Chaquopy 17.0.0's Python.start throws "cannot be retried" on every call in
                    // a process after one has failed. Recheck on a Chaquopy upgrade.
                    new Handler(Looper.getMainLooper())
                        .post(
                            () -> {
                              throw new RuntimeException(
                                  "Kolibri environment failed to initialize", t);
                            });
                    candidate.completeExceptionally(t);
                  }
                },
                "KolibriEnvInit")
            .start();
        return candidate;
      }
    }
  }
}
