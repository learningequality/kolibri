package org.learningequality.Kolibri.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.RandomAccessFile;
import java.nio.channels.OverlappingFileLockException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class CrossProcessLockTest {
  private static final String LOCKED = "locked";

  @Rule public TemporaryFolder folder = new TemporaryFolder();

  public static class LockHolder {
    public static void main(String[] args) throws IOException {
      try (RandomAccessFile file = new RandomAccessFile(args[0], "rw")) {
        file.getChannel().lock();
        System.out.println(LOCKED);
        System.out.flush();
        while (System.in.read() != -1) {}
      }
    }
  }

  @Test
  public void waitsForAnotherProcessToReleaseTheLock() throws Exception {
    File lockFile = new File(folder.getRoot(), "test.lock");
    Process holder = startLockHolder(lockFile);
    CountDownLatch bodyRan = new CountDownLatch(1);
    Thread waiter = new Thread(() -> CrossProcessLock.runExclusively(lockFile, bodyRan::countDown));
    try {
      waiter.start();

      assertFalse(
          "body ran while another process held the lock",
          bodyRan.await(500, TimeUnit.MILLISECONDS));

      holder.getOutputStream().close();
      assertTrue(
          "body did not run after the other process released the lock",
          bodyRan.await(10, TimeUnit.SECONDS));
    } finally {
      holder.destroy();
      holder.waitFor(10, TimeUnit.SECONDS);
      waiter.join(10_000);
    }
  }

  @Test
  public void holdsTheLockWhileTheBodyRuns() {
    File lockFile = new File(folder.getRoot(), "test.lock");

    CrossProcessLock.runExclusively(
        lockFile,
        () -> {
          try (RandomAccessFile other = new RandomAccessFile(lockFile, "rw")) {
            assertThrows(OverlappingFileLockException.class, () -> other.getChannel().tryLock());
          } catch (IOException e) {
            throw new RuntimeException(e);
          }
        });
  }

  @Test
  public void releasesTheLockWhenTheBodyThrows() {
    File lockFile = new File(folder.getRoot(), "test.lock");
    RuntimeException failure = new RuntimeException("body failed");

    RuntimeException thrown =
        assertThrows(
            RuntimeException.class,
            () ->
                CrossProcessLock.runExclusively(
                    lockFile,
                    () -> {
                      throw failure;
                    }));
    assertSame(failure, thrown);

    AtomicBoolean secondRan = new AtomicBoolean(false);
    CrossProcessLock.runExclusively(lockFile, () -> secondRan.set(true));
    assertTrue(secondRan.get());
  }

  @Test
  public void runsTheBodyWhenTheLockFileCannotBeOpened() throws IOException {
    File notADirectory = folder.newFile("not-a-directory");
    AtomicBoolean ran = new AtomicBoolean(false);

    CrossProcessLock.runExclusively(new File(notADirectory, "test.lock"), () -> ran.set(true));

    assertTrue(ran.get());
  }

  private static Process startLockHolder(File lockFile) throws Exception {
    String java = new File(System.getProperty("java.home"), "bin/java").getPath();
    String classpath =
        new File(LockHolder.class.getProtectionDomain().getCodeSource().getLocation().toURI())
            .getPath();
    Process holder =
        new ProcessBuilder(java, "-cp", classpath, LockHolder.class.getName(), lockFile.getPath())
            .redirectError(ProcessBuilder.Redirect.INHERIT)
            .start();
    BufferedReader stdout =
        new BufferedReader(new InputStreamReader(holder.getInputStream(), StandardCharsets.UTF_8));
    assertEquals(LOCKED, stdout.readLine());
    return holder;
  }
}
