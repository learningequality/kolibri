package org.learningequality.Kolibri;

import android.app.Notification;
import android.content.pm.ServiceInfo;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.work.ForegroundInfo;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.task.TaskWorkerImpl;
import org.learningequality.notification.Builder;
import org.learningequality.notification.NotificationRef;
import org.learningequality.task.Worker;

final public class ForegroundWorker extends Worker {
    private static final String TAG = "Kolibri.ForegroundWorker";

    public ForegroundWorker(
            @NonNull android.content.Context context,
            @NonNull androidx.work.WorkerParameters workerParams
    ) {
        super(context, workerParams);
    }

    protected TaskWorkerImpl getWorkerImpl() {
        Log.d(TAG, "Starting foreground task: " + getId());
        return new TaskWorkerImpl(getId(), getApplicationContext());
    }

    @Override
    @NonNull
    public Result doWork() {
        Log.d(TAG, "Setting task as foreground: " + getId());
        setForegroundAsync(getForegroundInfo());
        return super.doWork();
    }

    @NonNull
    public ForegroundInfo getForegroundInfo() {
        NotificationRef ref = getNotificationRef();
        Notification lastNotification = this.getLastNotification();
        if (lastNotification == null) {
            // build default notification
            lastNotification = new Builder(getApplicationContext(), ref).build();
        }
        // If API level is at least 29
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            return new ForegroundInfo(
                    ref.getId(),
                    lastNotification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST
            );
        }
        return new ForegroundInfo(ref.getId(), lastNotification);
    }

    @Override
    @NonNull
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture(completer -> completer.set(getForegroundInfo()));
    }
}
