package org.learningequality.Kolibri.workers;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.zip.CRC32;
import org.learningequality.Kolibri.KolibriEnvironmentInitializer;
import org.learningequality.Kolibri.KolibriEnvironmentManager;
import org.learningequality.Kolibri.notification.NotificationRef;
import org.learningequality.Kolibri.notification.Notifier;
import org.learningequality.Kolibri.task.Observer;
import org.learningequality.Kolibri.task.TaskWorkerImpl;

/**
 * Base class for Kolibri task workers
 *
 * <p>Provides common functionality for executing Python tasks via Chaquopy. Sets up TaskWorkerImpl
 * with observer pattern for progress notifications. Subclasses implement getWorkerType() to
 * differentiate behavior.
 */
public abstract class BaseTaskWorker extends Worker implements Notifier {
  private static final String TAG = "BaseTaskWorker";
  private Data lastProgressData;

  public BaseTaskWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  /**
   * Get the worker type for Python
   *
   * @return "foreground" or "background"
   */
  protected abstract String getWorkerType();

  @NonNull
  @Override
  public Result doWork() {
    String jobId = null;
    TaskWorkerImpl workerImpl = null;

    try {
      Log.d(TAG, "Starting " + getWorkerType() + " task execution");

      // Initialize Python and Kolibri environment in task_worker process.
      // Skip migrations (skipUpdate=true) — only the main process runs migrations
      // to avoid concurrent migration races on the shared database.
      KolibriEnvironmentManager.getInstance()
          .initializeAsync(new KolibriEnvironmentInitializer(getApplicationContext(), true))
          .join();

      // Get job ID from input data
      jobId = getInputData().getString("job_id");
      if (jobId == null || jobId.isEmpty()) {
        Log.e(TAG, "No job_id provided");
        return Result.failure();
      }

      Log.i(TAG, "Executing job: " + jobId + " (type: " + getWorkerType() + ")");

      // Create TaskWorkerImpl - this sets up the ThreadLocal so Python can notify us
      workerImpl = new TaskWorkerImpl(getId(), getApplicationContext());
      workerImpl.addObserver(
          new Observer<TaskWorkerImpl.Message>() {
            @Override
            public void update(TaskWorkerImpl.Message message) {
              onProgressUpdate(message);
            }
          });

      // Execute the task via TaskWorkerImpl (delegates to Python)
      boolean success = workerImpl.execute(jobId, getId().toString());
      Log.i(TAG, "Task " + jobId + " completed: " + (success ? "SUCCESS" : "FAILURE"));

      return success ? Result.success() : Result.failure();

    } catch (Exception e) {
      Log.e(TAG, "Error executing " + getWorkerType() + " task", e);
      return Result.failure();
    } finally {
      // Clean up TaskWorkerImpl
      if (workerImpl != null) {
        workerImpl.close();
      }
      // Hide notification when task completes
      hideNotification();
    }
  }

  /** Handle progress update from Python via TaskWorkerImpl observer */
  protected void onProgressUpdate(TaskWorkerImpl.Message message) {
    Log.d(
        TAG,
        "onProgressUpdate called: title="
            + message.notificationTitle
            + ", text="
            + message.notificationText);
    Data updateData = message.toData();
    // Only update progress if it has changed
    if (updateData.equals(lastProgressData)) {
      Log.d(TAG, "Progress unchanged, skipping notification update");
      return;
    }
    lastProgressData = updateData;
    // Log and track progress
    setProgressAsync(updateData);
    try {
      sendNotification(
          message.notificationTitle,
          message.notificationText,
          message.progress,
          message.totalProgress);
    } catch (Exception e) {
      Log.e(TAG, "Failed to update task progress for: " + getId(), e);
    }
  }

  @Override
  public NotificationRef getNotificationRef() {
    // Use CRC32 to generate a unique notification ID from the work request ID
    CRC32 crc = new CRC32();
    crc.update(getId().toString().getBytes());
    int notificationId = (int) crc.getValue();
    return new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, notificationId);
  }
}
