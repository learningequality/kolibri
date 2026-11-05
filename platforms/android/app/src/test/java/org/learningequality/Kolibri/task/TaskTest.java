package org.learningequality.Kolibri.task;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.work.ListenableWorker;
import androidx.work.OneTimeWorkRequest;
import androidx.work.testing.TestListenableWorkerBuilder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
public class TaskTest {

  @Test
  @Config(sdk = 30)
  public void buildWorkRequest_expeditedShortTask_workerProvidesForegroundInfo() throws Exception {
    Context context = RuntimeEnvironment.getApplication();
    OneTimeWorkRequest request =
        Task.buildWorkRequest("job-id", 0, true, "kolibri.core.tasks.test", false);

    ListenableWorker worker = TestListenableWorkerBuilder.from(context, request).build();

    assertNotNull(worker.getForegroundInfoAsync().get());
  }

  @Test
  public void buildWorkRequest_expeditedShortTask_requestStaysExpedited() {
    OneTimeWorkRequest request =
        Task.buildWorkRequest("job-id", 0, true, "kolibri.core.tasks.test", false);

    assertTrue(request.getWorkSpec().expedited);
  }
}
