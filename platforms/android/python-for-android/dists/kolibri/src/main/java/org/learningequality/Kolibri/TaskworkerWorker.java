package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.WorkRequest;
import androidx.work.WorkerParameters;

import org.kivy.android.PythonWorker;

public class TaskworkerWorker extends PythonWorker {
    private static final String TAG = "TaskworkerWorker";

    public static TaskworkerWorker mWorker = null;

    public TaskworkerWorker (
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);
        setPythonName("TaskWorker");
        setWorkerEntrypoint("taskworker.py");
        mWorker = this;
    }

    public static Data buildInputData (String workerArgument) {
        String dataArgument = workerArgument == null ? "" : workerArgument;
        Data data = new Data.Builder()
            .putString(ARGUMENT_WORKER_ARGUMENT, dataArgument)
            .putString(ARGUMENT_PACKAGE_NAME, "org.learningequality.Kolibri")
            .putString(ARGUMENT_CLASS_NAME,
                       TaskworkerWorkerService.class.getName())
            .build();
        Log.v(TAG, "Request data: " + data.toString());
        return data;
    }

    public static WorkRequest buildWorkRequest (
        WorkRequest.Builder builder,
        String workerArgument) {
        Data data = buildInputData(workerArgument);
        return builder.setInputData(data).build();
    }
}
