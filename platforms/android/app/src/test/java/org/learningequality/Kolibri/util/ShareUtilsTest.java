package org.learningequality.Kolibri.util;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class ShareUtilsTest {

  @Before
  public void setUp() {
    // Create a context wrapper that throws ActivityNotFoundException on startActivity
    // AND returns itself as getApplicationContext so ContextUtil stores it.
    Context throwingContext =
        new android.content.ContextWrapper(RuntimeEnvironment.getApplication()) {
          @Override
          public void startActivity(Intent intent) {
            throw new ActivityNotFoundException("No activity found");
          }

          @Override
          public Context getApplicationContext() {
            return this;
          }
        };
    ContextUtil.init(throwingContext);
  }

  @Test
  public void shareByIntent_handlesActivityNotFound_gracefully() {
    // Before fix: this throws ActivityNotFoundException and crashes
    // After fix: exception is caught and logged
    ShareUtils.shareByIntent(null, "test message", null, null);
    // No exception = pass
  }
}
