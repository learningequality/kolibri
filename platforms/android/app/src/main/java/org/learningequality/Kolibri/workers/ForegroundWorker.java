package org.learningequality.Kolibri.workers;

import android.content.Context;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import org.learningequality.Kolibri.notification.Manager;

/**
 * Foreground worker for long-running/high-priority Kolibri tasks
 *
 * <p>Shows persistent notification and uses foreground service to prevent system from killing the
 * worker during execution.
 */
public class ForegroundWorker extends BaseTaskWorker {
  private static final String TAG = "ForegroundWorker";

  public ForegroundWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @Override
  protected String getWorkerType() {
    return "foreground";
  }

  @NonNull
  @Override
  public Result doWork() {
    try {
      setForegroundAsync(getForegroundInfo());
    } catch (Exception e) {
      android.util.Log.w(TAG, "Failed to set foreground", e);
    }
    return super.doWork();
  }

  @NonNull
  @Override
  public ForegroundInfo getForegroundInfo() {
    // Get job ID for notification
    String jobId = getInputData().getString("job_id");

    // Create notification via Manager
    return Manager.createForegroundInfo(getApplicationContext(), jobId, getForegroundServiceType());
  }

  private int getForegroundServiceType() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
    }
    return 0;
  }
}
