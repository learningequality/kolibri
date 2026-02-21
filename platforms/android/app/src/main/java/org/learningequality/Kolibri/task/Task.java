package org.learningequality.Kolibri.task;

import android.content.Context;
import android.util.Log;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.multiprocess.RemoteWorkManager;
import java.util.concurrent.TimeUnit;
import org.learningequality.Kolibri.util.ContextUtil;
import org.learningequality.Kolibri.workers.BackgroundWorker;
import org.learningequality.Kolibri.workers.ForegroundWorker;

/**
 * Thin Java wrapper for WorkManager task enqueueing. Called from Python
 * (android_app_plugin/kolibri_plugin.py) to schedule Kolibri tasks.
 *
 * <p>This class is intentionally minimal - all database access and reconciliation logic is handled
 * in Python to avoid recursive Python->Java->Python calls.
 */
public class Task {
  public static final String TAG = "Kolibri.Task";

  /**
   * Enqueue a task with WorkManager from Python
   *
   * @param id Job ID (UUID string)
   * @param delay Delay in seconds before task should run
   * @param expedite Whether to expedite (high priority) this task
   * @param jobFunc Kolibri job function name (for logging)
   * @param longRunning Whether this is a long-running task
   * @return Work request ID (different from job ID)
   */
  public static String enqueueOnce(
      String id, double delay, boolean expedite, String jobFunc, boolean longRunning) {
    try {
      Context context = ContextUtil.getApplicationContext();
      RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);

      // Build work data
      Data inputData =
          new Data.Builder()
              .putString("job_id", id)
              .putString("task_id", id)
              .putString("job_func", jobFunc)
              .build();

      // Select worker class based on long_running flag
      Class<? extends androidx.work.Worker> workerClass;
      if (longRunning) {
        workerClass = ForegroundWorker.class;
      } else {
        workerClass = BackgroundWorker.class;
      }

      // Build work request with delay and priority
      OneTimeWorkRequest.Builder requestBuilder =
          new OneTimeWorkRequest.Builder(workerClass)
              .setInputData(inputData)
              .addTag("kolibri:job:" + id);

      // Set initial delay if specified
      if (delay > 0) {
        long delayMillis = (long) (delay * 1000);
        requestBuilder.setInitialDelay(delayMillis, TimeUnit.MILLISECONDS);
      }

      // Set expedite flag for high priority tasks (only if no delay - can't expedite delayed jobs)
      if (expedite && delay <= 0) {
        requestBuilder.setExpedited(
            androidx.work.OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
      }

      OneTimeWorkRequest workRequest = requestBuilder.build();

      // Use unique work to prevent duplicate task execution
      // REPLACE policy ensures the latest schedule takes effect
      workManager.enqueueUniqueWork(id, ExistingWorkPolicy.REPLACE, workRequest);

      String workRequestId = workRequest.getId().toString();
      Log.d(
          TAG,
          "Enqueued unique task "
              + id
              + " (func="
              + jobFunc
              + ", delay="
              + delay
              + "s, expedite="
              + expedite
              + ", longRunning="
              + longRunning
              + ") -> "
              + workRequestId);

      return workRequestId;

    } catch (Exception e) {
      Log.e(TAG, "Failed to enqueue task " + id, e);
      return null;
    }
  }

  /**
   * Cancel a task by job ID
   *
   * @param id Job ID to cancel
   */
  public static void clear(String id) {
    try {
      Context context = ContextUtil.getApplicationContext();
      RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);
      workManager.cancelAllWorkByTag("kolibri:job:" + id);
      Log.d(TAG, "Cancelled task " + id);
    } catch (Exception e) {
      Log.e(TAG, "Failed to cancel task " + id, e);
    }
  }
}
