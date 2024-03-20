package org.learningequality.Kolibri;


import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.WorkerParameters;

import org.learningequality.notification.Manager;
import org.learningequality.notification.NotificationRef;
import org.learningequality.task.Worker;

import org.learningequality.Kolibri.task.TaskWorkerImpl;

/**
 * Background worker that runs a Python task in a background thread. This will likely be run by the
 * SystemJobService.
 */
final public class BackgroundWorker extends Worker {
    private static final String TAG = "Kolibri.BackgroundWorker";

    public BackgroundWorker(
            @NonNull Context context, @NonNull WorkerParameters workerParams
    ) {
        super(context, workerParams);
    }

    protected TaskWorkerImpl getWorkerImpl() {
        Log.d(TAG, "Starting background task: " + getId());
        return new TaskWorkerImpl(getId(), getApplicationContext());
    }
}
