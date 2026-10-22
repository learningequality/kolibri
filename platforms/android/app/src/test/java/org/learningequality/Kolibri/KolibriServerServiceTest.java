package org.learningequality.Kolibri;

import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ServiceController;

@RunWith(RobolectricTestRunner.class)
public class KolibriServerServiceTest {

  private final CountDownLatch releaseServerThread = new CountDownLatch(1);

  @Before
  public void setUp() throws Exception {
    KolibriEnvironmentInitializer initializer = mock(KolibriEnvironmentInitializer.class);
    doAnswer(
            invocation -> {
              releaseServerThread.await(10, TimeUnit.SECONDS);
              throw new IllegalStateException("released");
            })
        .when(initializer)
        .initialize();
    KolibriEnvironmentManager.getInstance().initializeAsync(initializer);
  }

  @After
  public void tearDown() {
    releaseServerThread.countDown();
  }

  @Test
  public void stoppingDoesNotWaitForTheServerToStop() {
    ServiceController<KolibriServerService> controller =
        Robolectric.buildService(KolibriServerService.class).create().startCommand(0, 1);
    long start = System.nanoTime();

    controller.destroy();

    assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start) < 1000);
  }
}
