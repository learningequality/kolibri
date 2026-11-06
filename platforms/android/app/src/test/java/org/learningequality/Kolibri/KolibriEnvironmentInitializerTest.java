package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.mockito.Answers.RETURNS_SELF;
import static org.mockito.Mockito.mock;

import android.content.Context;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.util.HashMap;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implementation;
import org.robolectric.annotation.Implements;
import org.robolectric.shadow.api.Shadow;

@RunWith(RobolectricTestRunner.class)
@Config(
    instrumentedPackages = {"com.chaquo.python"},
    shadows = {
      KolibriEnvironmentInitializerTest.FakePython.class,
      KolibriEnvironmentInitializerTest.FakeAndroidPlatform.class
    })
public class KolibriEnvironmentInitializerTest {
  private static final String START = "Python.start";

  private static boolean started;
  private static Map<String, Boolean> lockHeldDuring;

  @Implements(Python.class)
  public static class FakePython {
    @Implementation
    protected static boolean isStarted() {
      return started;
    }

    @Implementation
    protected static void start(Python.Platform platform) {
      lockHeldDuring.put(START, isStartupLockHeld());
      started = true;
    }

    @Implementation
    protected static Python getInstance() {
      return Shadow.newInstanceOf(Python.class);
    }

    @Implementation
    protected PyObject getModule(String name) {
      lockHeldDuring.put(name, isStartupLockHeld());
      return mock(PyObject.class, RETURNS_SELF);
    }
  }

  @Implements(AndroidPlatform.class)
  public static class FakeAndroidPlatform {
    @Implementation
    protected void __constructor__(Context context) {}
  }

  @Before
  public void setUp() {
    started = false;
    lockHeldDuring = new HashMap<>();
  }

  @Test
  public void startsPythonWhileHoldingTheStartupLock() {
    initialize();

    assertEquals(Boolean.TRUE, lockHeldDuring.get(START));
  }

  @Test
  public void importsKolibriWhileHoldingTheStartupLock() {
    initialize();

    assertEquals(Boolean.TRUE, lockHeldDuring.get("monkey_patch_zeroconf"));
  }

  private static void initialize() {
    new KolibriEnvironmentInitializer(RuntimeEnvironment.getApplication(), true).initialize();
  }

  private static boolean isStartupLockHeld() {
    File lockFile =
        new File(RuntimeEnvironment.getApplication().getFilesDir(), "python-startup.lock");
    try (RandomAccessFile probe = new RandomAccessFile(lockFile, "rw")) {
      FileLock lock = probe.getChannel().tryLock();
      lock.release();
      return false;
    } catch (OverlappingFileLockException e) {
      return true;
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
