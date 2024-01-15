package org.learningequality.Kolibri;


import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.WorkerParameters;

import org.learningequality.task.Worker;
import org.kivy.android.PythonWorker;

/**
 * Background worker that runs a Python task in a background thread. This will likely be run by the
 * SystemJobService.
 */
final public class BackgroundWorker extends androidx.work.Worker implements Worker {
    private static final String TAG = "Kolibri.BackgroundWorker";
    private final PythonWorker workerImpl;

    public BackgroundWorker(
            @NonNull Context context, @NonNull WorkerParameters workerParams
    ) {
        super(context, workerParams);
        workerImpl = new PythonWorker(context, "TaskWorker", "taskworker.py");
    }

    /**
     * Parent worker class will call this method on a background thread automatically.
     */
    @Override
    @NonNull
    public Result doWork() {
        Log.d(TAG, "Running background task " + getId());
        final String id = getId().toString();
        final String arg = getArgument();
        return workerImpl.execute(id, arg) ? Result.success() : Result.failure();
    }
}
