package org.learningequality.Kolibri;

import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Before;
import org.junit.Test;

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
  public void initializeAsync_retriesAfterFailure() throws Exception {
    KolibriEnvironmentInitializer failing = mock(KolibriEnvironmentInitializer.class);
    doThrow(new RuntimeException("init failed")).when(failing).initialize();

    CompletableFuture<Void> first = manager.initializeAsync(failing);
    try {
      first.get(5, TimeUnit.SECONDS);
      fail("Expected initialization failure to propagate");
    } catch (Exception expected) {
      // join()/get() surfaces the initializer failure to callers
    }

    KolibriEnvironmentInitializer succeeding = mock(KolibriEnvironmentInitializer.class);
    CompletableFuture<Void> second = manager.initializeAsync(succeeding);

    assertNotSame("Failed init must be replaced so a later call can retry", first, second);
    second.get(5, TimeUnit.SECONDS);
    verify(succeeding, times(1)).initialize();
  }
}
