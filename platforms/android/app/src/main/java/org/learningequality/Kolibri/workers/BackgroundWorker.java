package org.learningequality.Kolibri.workers;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.WorkerParameters;

/**
 * Background worker for short/low-priority Kolibri tasks
 *
 * <p>No persistent notification, can be killed by system if resources needed.
 */
public class BackgroundWorker extends BaseTaskWorker {

  public BackgroundWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @Override
  protected String getWorkerType() {
    return "background";
  }
}
