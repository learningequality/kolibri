package org.learningequality.Kolibri;

import android.util.Log;

import androidx.work.multiprocess.RemoteWorkerService;

import org.learningequality.notification.NotificationRef;
import org.learningequality.notification.Notifier;

/**
 * Dedicated service for running tasks in the foreground via RemoteListenableWorker.
 */
public class WorkerService extends RemoteWorkerService implements Notifier {
    private static final String TAG = "Kolibri.ForegroundWorkerService";

    public static WorkerService mService = null;

    @Override
    public void onCreate() {
        Log.d(TAG, "Initializing foreground worker service");
        super.onCreate();
        // We could potentially remove this and leave the notification up to long-running workers
        // bound to the service
        sendNotification();
        mService = this;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Destroying foreground worker service");
        hideNotification();
        super.onDestroy();
        mService = null;
    }

    public NotificationRef getNotificationRef() {
        return new NotificationRef(NotificationRef.REF_CHANNEL_SERVICE);
    }
}
