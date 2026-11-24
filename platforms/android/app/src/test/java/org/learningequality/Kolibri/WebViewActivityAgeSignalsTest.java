package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.robolectric.Shadows.shadowOf;

import android.content.Context;
import android.os.Looper;
import android.util.Log;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.TaskCompletionSource;
import com.google.android.gms.tasks.Tasks;
import com.google.android.play.agesignals.AgeSignalsAccessResult;
import com.google.android.play.agesignals.AgeSignalsException;
import com.google.android.play.agesignals.AgeSignalsManager;
import com.google.android.play.agesignals.AgeSignalsManagerFactory;
import com.google.android.play.agesignals.AgeSignalsResult;
import com.google.android.play.agesignals.ApplicableAgeFeaturesResult;
import com.google.android.play.agesignals.model.AgeSignalsErrorCode;
import com.google.android.play.agesignals.model.AgeSignalsStatus;
import com.google.android.play.agesignals.model.ApplicableAgeFeature;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.After;
import org.junit.Before;
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
import org.robolectric.util.ReflectionHelpers;

@RunWith(RobolectricTestRunner.class)
@Config(shadows = WebViewActivityAgeSignalsTest.FakeAgeSignalsManagerFactory.class)
public class WebViewActivityAgeSignalsTest {
  private static final String ACTIVITY_LOG_TAG = "WebViewActivity";
  private static final String INSTALL_ID = "install-id-7f3a9c52e1";
  private static final Set<Integer> MANDATORY_SHARING =
      Collections.singleton(ApplicableAgeFeature.MANDATORY_SHARING);
  private static final int UNKNOWN_FEATURE = ApplicableAgeFeature.MANDATORY_SHARING + 1;

  private static AgeSignalsManager manager;
  private static RuntimeException factoryFailure;

  private ActivityController<WebViewActivity> controller;

  @Implements(AgeSignalsManagerFactory.class)
  public static class FakeAgeSignalsManagerFactory {
    @Implementation
    protected static AgeSignalsManager create(Context context) {
      if (factoryFailure != null) {
        throw factoryFailure;
      }
      return manager != null ? manager : managerPlayNeverAnswers();
    }
  }

  @Before
  public void setUp() {
    manager = managerPlayNeverAnswers();
  }

  @After
  public void tearDown() {
    manager = null;
    factoryFailure = null;
    controller.close();
    KolibriServerViewModel.getInstance().resetServerState();
    shadowOf(Looper.getMainLooper()).idle();
  }

  @Test
  public void noFeaturesMeansAccessIsNeverRequested() {
    playReportsFeatures(Collections.emptySet());

    launch();

    verify(manager, never()).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aFeatureOtherThanMandatorySharingMeansAccessIsNeverRequested() {
    playReportsFeatures(Collections.singleton(UNKNOWN_FEATURE));

    launch();

    verify(manager, never()).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aSharedSignalIsFetchedOnce() {
    playSharesTheSignal();

    WebViewActivity activity = launch();

    verify(manager, times(1)).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aSharedSignalReachesNoLogLine() {
    playSharesTheSignal();

    launch();

    List<String> leaks =
        ShadowLog.getLogs().stream()
            .map(item -> item.msg + Log.getStackTraceString(item.throwable))
            .filter(line -> line.contains(INSTALL_ID))
            .collect(Collectors.toList());
    assertEquals(Collections.emptyList(), leaks);
  }

  @Test
  public void aSharedSignalReachesNoFile() throws IOException {
    playSharesTheSignal();

    WebViewActivity activity = launch();
    flushSharedPreferencesWrites();

    assertEquals(Collections.emptyList(), filesContaining(activity, INSTALL_ID));
  }

  @Test
  public void aSharedSignalIsNeverRead() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.SHARED);
    AgeSignalsResult signal = mock(AgeSignalsResult.class);
    when(manager.checkAgeSignals(any())).thenReturn(Tasks.forResult(signal));

    launch();

    verify(manager, times(1)).checkAgeSignals(any());
    verifyNoInteractions(signal);
  }

  @Test
  public void aSignalThatIsNotSharedIsNeverFetched() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.NOT_SHARED);

    launch();

    verify(manager, times(1)).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aSignalAwaitingVerificationIsNeverFetched() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.VERIFICATION_REQUIRED);

    launch();

    verify(manager, times(1)).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aSignalOfUnspecifiedStatusIsNeverFetched() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.UNSPECIFIED);

    launch();

    verify(manager, times(1)).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aSignalWithNoStatusIsNeverFetched() {
    playReportsFeatures(MANDATORY_SHARING);
    when(manager.requestAgeSignalsAccess(any()))
        .thenReturn(Tasks.forResult(AgeSignalsAccessResult.builder().build()));

    launch();

    verify(manager, times(1)).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  @Test
  public void aFailedFeaturesCallEndsTheFlowWithOneDebugLine() {
    when(manager.getApplicableAgeFeatures(any())).thenReturn(Tasks.forException(playFailure()));

    WebViewActivity activity = launch();

    verify(manager, never()).requestAgeSignalsAccess(any());
    verify(manager, never()).checkAgeSignals(any());
    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aFailedAccessCallEndsTheFlowWithOneDebugLine() {
    playReportsFeatures(MANDATORY_SHARING);
    when(manager.requestAgeSignalsAccess(any())).thenReturn(Tasks.forException(playFailure()));

    WebViewActivity activity = launch();

    verify(manager, never()).checkAgeSignals(any());
    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aFailedSignalCallLeavesOneDebugLine() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.SHARED);
    when(manager.checkAgeSignals(any())).thenReturn(Tasks.forException(playFailure()));

    WebViewActivity activity = launch();

    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aFeaturesCallThatThrowsLeavesOneDebugLine() {
    when(manager.getApplicableAgeFeatures(any())).thenThrow(new IllegalStateException());

    WebViewActivity activity = launch();

    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void anAccessCallThatThrowsLeavesOneDebugLine() {
    playReportsFeatures(MANDATORY_SHARING);
    when(manager.requestAgeSignalsAccess(any())).thenThrow(new IllegalStateException());

    WebViewActivity activity = launch();

    verify(manager, never()).checkAgeSignals(any());
    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aSignalCallThatThrowsLeavesOneDebugLine() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.SHARED);
    when(manager.checkAgeSignals(any())).thenThrow(new IllegalStateException());

    WebViewActivity activity = launch();

    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aFactoryThatThrowsLeavesOneDebugLine() {
    factoryFailure = new IllegalStateException();

    WebViewActivity activity = launch();

    assertOneDebugFailureLine();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aFeaturesCallThatNeverAnswersLeavesLaunchUnaffected() {
    WebViewActivity activity = launch();

    verify(manager, times(1)).getApplicableAgeFeatures(any());
    verify(manager, never()).requestAgeSignalsAccess(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
    assertLaunchUnaffected(activity);
  }

  @Test
  public void aRecreatedActivityAsksPlayAgain() {
    launch();

    controller.recreate();
    shadowOf(Looper.getMainLooper()).idle();

    verify(manager, times(2)).getApplicableAgeFeatures(any());
  }

  @Test
  public void anActivityDestroyedBeforeFeaturesArriveNeverRequestsAccess() {
    TaskCompletionSource<ApplicableAgeFeaturesResult> features = new TaskCompletionSource<>();
    when(manager.getApplicableAgeFeatures(any())).thenReturn(features.getTask());
    launch();

    controller.destroy();
    features.setResult(featuresResult(MANDATORY_SHARING));
    shadowOf(Looper.getMainLooper()).idle();

    verify(manager, never()).requestAgeSignalsAccess(any());
    assertLogsNoMoreThanALaunchPlayNeverAnswers();
  }

  private WebViewActivity launch() {
    controller = Robolectric.buildActivity(WebViewActivity.class).setup();
    shadowOf(Looper.getMainLooper()).idle();
    return controller.get();
  }

  static AgeSignalsManager managerPlayNeverAnswers() {
    AgeSignalsManager unanswered = mock(AgeSignalsManager.class);
    Task<ApplicableAgeFeaturesResult> pending =
        new TaskCompletionSource<ApplicableAgeFeaturesResult>().getTask();
    when(unanswered.getApplicableAgeFeatures(any())).thenReturn(pending);
    return unanswered;
  }

  private static ApplicableAgeFeaturesResult featuresResult(Set<Integer> features) {
    return ApplicableAgeFeaturesResult.builder().setFeatures(features).build();
  }

  private static void playReportsFeatures(Set<Integer> features) {
    when(manager.getApplicableAgeFeatures(any()))
        .thenReturn(Tasks.forResult(featuresResult(features)));
  }

  private static void playAnswersAccessWith(int status) {
    when(manager.requestAgeSignalsAccess(any()))
        .thenReturn(
            Tasks.forResult(AgeSignalsAccessResult.builder().setAgeSignalsStatus(status).build()));
  }

  private static void playSharesTheSignal() {
    playReportsFeatures(MANDATORY_SHARING);
    playAnswersAccessWith(AgeSignalsStatus.SHARED);
    when(manager.checkAgeSignals(any()))
        .thenReturn(Tasks.forResult(AgeSignalsResult.builder().setInstallId(INSTALL_ID).build()));
  }

  private static AgeSignalsException playFailure() {
    return new AgeSignalsException(AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND);
  }

  private static List<ShadowLog.LogItem> failureLines() {
    return ShadowLog.getLogsForTag(ACTIVITY_LOG_TAG).stream()
        .filter(item -> item.throwable != null)
        .collect(Collectors.toList());
  }

  private static List<String> linesWithoutAThrowable() {
    return ShadowLog.getLogsForTag(ACTIVITY_LOG_TAG).stream()
        .filter(item -> item.throwable == null)
        .map(item -> item.msg)
        .collect(Collectors.toList());
  }

  private static void assertLogsNoMoreThanALaunchPlayNeverAnswers() {
    assertEquals(Collections.emptyList(), failureLines());
    assertOtherLinesMatchALaunchPlayNeverAnswers();
  }

  private static void assertOtherLinesMatchALaunchPlayNeverAnswers() {
    List<String> logged = linesWithoutAThrowable();
    ShadowLog.clear();
    manager = managerPlayNeverAnswers();
    factoryFailure = null;
    try (ActivityController<WebViewActivity> unanswered =
        Robolectric.buildActivity(WebViewActivity.class).setup()) {
      shadowOf(Looper.getMainLooper()).idle();
    }
    assertEquals(linesWithoutAThrowable(), logged);
  }

  private static void assertOneDebugFailureLine() {
    List<ShadowLog.LogItem> lines = failureLines();
    assertEquals(lines.toString(), 1, lines.size());
    assertEquals(Log.DEBUG, lines.get(0).type);
    assertOtherLinesMatchALaunchPlayNeverAnswers();
  }

  private static void assertLaunchUnaffected(WebViewActivity activity) {
    assertFalse(activity.isFinishing());
    assertNull(ShadowDialog.getLatestDialog());
    assertNull(ShadowToast.getLatestToast());
  }

  // SharedPreferences.apply() writes to disk from android.app.QueuedWork, a hidden framework class.
  private static void flushSharedPreferencesWrites() {
    ReflectionHelpers.callStaticMethod(
        ReflectionHelpers.loadClass(
            WebViewActivityAgeSignalsTest.class.getClassLoader(), "android.app.QueuedWork"),
        "waitToFinish");
  }

  private static List<Path> filesContaining(WebViewActivity activity, String text)
      throws IOException {
    List<Path> roots =
        Arrays.asList(
            Paths.get(activity.getApplicationInfo().dataDir),
            activity.getExternalFilesDir(null).toPath(),
            activity.getExternalCacheDir().toPath());
    List<Path> matches = new ArrayList<>();
    for (Path root : roots) {
      try (Stream<Path> paths = Files.walk(root)) {
        for (Path path : paths.filter(Files::isRegularFile).collect(Collectors.toList())) {
          String content = new String(Files.readAllBytes(path), StandardCharsets.ISO_8859_1);
          if (content.contains(text)) {
            matches.add(path);
          }
        }
      }
    }
    return matches;
  }
}
