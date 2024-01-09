package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;

import org.kivy.android.PythonWorker;
import org.learningequality.NotificationBuilder;
import org.learningequality.Notifier;
import org.learningequality.NotificationRef;

public class TaskworkerWorker extends PythonWorker implements Notifier {
    private static final String TAG = "TaskworkerWorker";

    public static TaskworkerWorker mWorker = null;

    public TaskworkerWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);
        setPythonName("TaskWorker");
        setWorkerEntrypoint("taskworker.py");
        mWorker = this;
    }

    protected void cleanup() {
        hideNotification();
        mWorker = null;
    }

    @Override
    public ForegroundInfo getForegroundInfo() {
        NotificationRef ref;
        // If we are running in the service, use the service notification ref
        if (TaskworkerWorkerService.mService != null) {
            ref = TaskworkerWorkerService.mService.getNotificationRef();
        } else {
            ref = getNotificationRef();
            Log.w(TAG, "No service found, using worker notification for foreground");
        }

        NotificationBuilder builder = new NotificationBuilder(getApplicationContext(), ref);

        return new ForegroundInfo(ref.getId(), builder.build());
    }

    public NotificationRef getNotificationRef() {
        // Use worker request ID as notification tag
        String tag = getId().toString();
        return new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, tag);
    }

    public static void updateProgress(String notificationTitle, String notificationText, int progress, int total) {
        if (mWorker != null) {
            // We could also update progress on the worker here, if we need info about it on
            // the Android side
            // @see setProgressAsync
            mWorker.sendNotification(notificationTitle, notificationText, progress, total);
        }
    }

    public static void clearNotification() {
        if (mWorker != null) {
            mWorker.hideNotification();
        }
    }

    public static Data buildInputData(String workerArgument) {
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
}
