package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.multiprocess.RemoteWorkerService;
import androidx.work.WorkManager;

import java.io.File;

import org.kivy.android.PythonUtil;
import org.learningequality.NotificationRef;
import org.learningequality.Notifier;

public class TaskworkerWorkerService extends RemoteWorkerService implements Notifier {
    private static final String TAG = "TaskworkerWorkerService";

    public static TaskworkerWorkerService mService = null;

    @Override
    public void onCreate() {
        mService = this;
        Context context = getApplicationContext();
        Log.v(TAG, "Initializing task worker service");
        PythonUtil.loadLibraries(
                new File(context.getApplicationInfo().nativeLibraryDir)
        );
        // Initialize the work manager
        WorkManager.getInstance(getApplicationContext());
        enqueueTaskReconciliation();
        super.onCreate();
        // We could potentially remove this and leave the notification up to long-running workers
        // bound to the service
        sendNotification();
    }

    @Override
    public void onDestroy() {
        hideNotification();
        super.onDestroy();
        mService = null;
    }

    public NotificationRef getNotificationRef() {
        return new NotificationRef(NotificationRef.REF_CHANNEL_SERVICE);
    }

    private void enqueueTaskReconciliation() {
        WorkManager workManager = WorkManager.getInstance(this);

        PeriodicWorkRequest.Builder builder = new PeriodicWorkRequest.Builder(
                ReconcileWorker.class,
                30,
                java.util.concurrent.TimeUnit.MINUTES
        );
        builder.setInputData(ReconcileWorker.buildInputData());

        workManager.enqueueUniquePeriodicWork(
                "task_reconciliation",
                ExistingPeriodicWorkPolicy.REPLACE,
                builder.build()
        );
    }
}
