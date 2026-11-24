package org.learningequality.Kolibri;

import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.robolectric.Shadows.shadowOf;

import android.os.Looper;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.shadows.ShadowLooper;

@RunWith(RobolectricTestRunner.class)
public class KolibriEnvironmentManagerTest {

  private KolibriEnvironmentManager manager;

  @Before
  public void setUp() {
    // Use a fresh instance per test instead of the process-wide singleton
    manager = new KolibriEnvironmentManager();
  }

  @Test
  public void initializeAsync_runsInitializerOnce() throws Exception {
    KolibriEnvironmentInitializer initializer = mock(KolibriEnvironmentInitializer.class);

    CompletableFuture<Void> first = manager.initializeAsync(initializer);
    first.get(5, TimeUnit.SECONDS);
    CompletableFuture<Void> second = manager.initializeAsync(initializer);

    assertSame("Second call must return the same future", first, second);
    verify(initializer, times(1)).initialize();
  }

  /**
   * Regression guard for the ANR fixed in the previous KolibriEnvironmentSetup design:
   * initializeAsync must return immediately even while an initialization is in progress, since it
   * is called from the main thread in App.onCreate and Service.onCreate.
   */
  @Test
  public void initializeAsync_doesNotBlockWhileInitInProgress() throws Exception {
    CountDownLatch initStarted = new CountDownLatch(1);
    CountDownLatch releaseInit = new CountDownLatch(1);
    KolibriEnvironmentInitializer initializer = mock(KolibriEnvironmentInitializer.class);
    doAnswer(
            invocation -> {
              initStarted.countDown();
              releaseInit.await(5, TimeUnit.SECONDS);
              return null;
            })
        .when(initializer)
        .initialize();

    CompletableFuture<Void> first = manager.initializeAsync(initializer);
    assertTrue("Initializer did not start", initStarted.await(1, TimeUnit.SECONDS));

    try {
      long start = System.nanoTime();
      CompletableFuture<Void> second = manager.initializeAsync(initializer);
      long elapsedMs = (System.nanoTime() - start) / 1_000_000;

      assertSame(first, second);
      assertTrue(
          "initializeAsync blocked for " + elapsedMs + "ms during in-flight init", elapsedMs < 500);
    } finally {
      releaseInit.countDown();
      first.get(5, TimeUnit.SECONDS);
    }
  }

  @Test
  public void initializeAsync_crashesTheMainThreadOnFailure() throws Exception {
    RuntimeException failure = new RuntimeException("init failed");
    KolibriEnvironmentInitializer failing = mock(KolibriEnvironmentInitializer.class);
    doThrow(failure).when(failing).initialize();

    CompletableFuture<Void> future = manager.initializeAsync(failing);
    ExecutionException surfaced =
        assertThrows(ExecutionException.class, () -> future.get(5, TimeUnit.SECONDS));
    assertSame(failure, surfaced.getCause());

    ShadowLooper mainLooper = shadowOf(Looper.getMainLooper());
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
    while (mainLooper.isIdle() && System.nanoTime() < deadline) {
      Thread.sleep(10);
    }
    Throwable crash = assertThrows(Throwable.class, mainLooper::idle);
    for (Throwable t = crash; t != failure; t = t.getCause()) {
      if (t == null) {
        fail("Expected the main-thread crash to be caused by " + failure + ", got " + crash);
      }
    }
  }
}
