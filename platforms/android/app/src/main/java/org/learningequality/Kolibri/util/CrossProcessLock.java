package org.learningequality.Kolibri.util;

import android.util.Log;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;

public final class CrossProcessLock {
  private static final String TAG = "CrossProcessLock";

  private CrossProcessLock() {}

  public static void runExclusively(File lockFile, Runnable body) {
    RandomAccessFile file = null;
    try {
      file = new RandomAccessFile(lockFile, "rw");
      file.getChannel().lock();
    } catch (IOException e) {
      Log.w(TAG, "Could not take the lock at " + lockFile + ", continuing without it", e);
    }
    try {
      body.run();
    } finally {
      close(file);
    }
  }

  private static void close(RandomAccessFile file) {
    if (file == null) {
      return;
    }
    try {
      file.close();
    } catch (IOException e) {
      Log.w(TAG, "Could not close the lock file", e);
    }
  }
}
