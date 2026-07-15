package org.learningequality.Kolibri.util;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import java.io.File;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class ContextUtilTest {

  @Before
  public void setUp() {
    ContextUtil.init(RuntimeEnvironment.getApplication());
  }

  @Test
  public void getExternalFilesDir_returnsPath_whenExternalStorageAvailable() {
    String path = ContextUtil.getExternalFilesDir();
    assertNotNull(path);
    assertTrue(path.length() > 0);
  }

  @Test
  public void getExternalFilesDir_fallsBackToInternal_whenExternalStorageNull() {
    // Create a context wrapper that returns null for getExternalFilesDir
    // AND returns itself as getApplicationContext so ContextUtil stores it.
    Context nullExternalContext =
        new android.content.ContextWrapper(RuntimeEnvironment.getApplication()) {
          @Override
          public File getExternalFilesDir(String type) {
            return null;
          }

          @Override
          public Context getApplicationContext() {
            return this;
          }
        };
    ContextUtil.init(nullExternalContext);
    // Before fix: this throws NPE because getExternalFilesDir(null) returns null
    // and we call .getAbsolutePath() on null.
    // After fix: should fall back to getFilesDir() and return a valid path.
    String path = ContextUtil.getExternalFilesDir();
    assertNotNull("Should fall back to internal storage when external is null", path);
    assertTrue(path.length() > 0);
  }
}
