package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.robolectric.Shadows.shadowOf;
import static org.robolectric.util.reflector.Reflector.reflector;

import android.content.Context;
import android.os.Looper;
import android.util.Log;
import com.google.android.play.agesignals.AgeSignalsManager;
import com.google.android.play.agesignals.AgeSignalsManagerFactory;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implementation;
import org.robolectric.annotation.Implements;
import org.robolectric.shadows.ShadowDialog;
import org.robolectric.shadows.ShadowLog;
import org.robolectric.shadows.ShadowToast;
import org.robolectric.util.reflector.Direct;
import org.robolectric.util.reflector.ForType;
import org.robolectric.util.reflector.Static;

/** Runs the real age-signals library, which finds no Play Store on Robolectric's device. */
@RunWith(RobolectricTestRunner.class)
@Config(shadows = WebViewActivitySideloadedAgeSignalsTest.RealOrUnansweredFactory.class)
public class WebViewActivitySideloadedAgeSignalsTest {
  private static final String ACTIVITY_LOG_TAG = "WebViewActivity";

  private static boolean playNeverAnswers;

  private ActivityController<WebViewActivity> controller;

  @ForType(AgeSignalsManagerFactory.class)
  interface RealFactory {
    @Static
    @Direct
    AgeSignalsManager create(Context context);
  }

  @Implements(AgeSignalsManagerFactory.class)
  public static class RealOrUnansweredFactory {
    @Implementation
    protected static AgeSignalsManager create(Context context) {
      return playNeverAnswers
          ? WebViewActivityAgeSignalsTest.managerPlayNeverAnswers()
          : reflector(RealFactory.class).create(context);
    }
  }

  @After
  public void tearDown() {
    playNeverAnswers = false;
    controller.close();
    KolibriServerViewModel.getInstance().resetServerState();
    shadowOf(Looper.getMainLooper()).idle();
  }

  @Test
  public void aLaunchWithoutThePlayStoreShowsNoErrorUi() {
    controller = Robolectric.buildActivity(WebViewActivity.class).setup();
    shadowOf(Looper.getMainLooper()).idle();

    WebViewActivity activity = controller.get();
    assertFalse(activity.isFinishing());
    assertNull(ShadowDialog.getLatestDialog());
    assertNull(ShadowToast.getLatestToast());
    List<ShadowLog.LogItem> failures =
        ShadowLog.getLogsForTag(ACTIVITY_LOG_TAG).stream()
            .filter(item -> item.throwable != null)
            .collect(Collectors.toList());
    assertEquals(failures.toString(), 1, failures.size());
    assertEquals(Log.DEBUG, failures.get(0).type);

    List<String> logged = linesWithoutAThrowable();
    ShadowLog.clear();
    playNeverAnswers = true;
    try (ActivityController<WebViewActivity> unanswered =
        Robolectric.buildActivity(WebViewActivity.class).setup()) {
      shadowOf(Looper.getMainLooper()).idle();
    }
    assertEquals(linesWithoutAThrowable(), logged);
  }

  private static List<String> linesWithoutAThrowable() {
    return ShadowLog.getLogsForTag(ACTIVITY_LOG_TAG).stream()
        .filter(item -> item.throwable == null)
        .map(item -> item.msg)
        .collect(Collectors.toList());
  }
}
