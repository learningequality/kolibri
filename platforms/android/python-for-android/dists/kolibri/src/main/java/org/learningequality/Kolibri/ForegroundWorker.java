package org.learningequality.Kolibri;

import android.annotation.SuppressLint;
import android.content.pm.ServiceInfo;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.work.ForegroundInfo;
import androidx.work.impl.utils.futures.SettableFuture;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.notification.Builder;
import org.learningequality.notification.NotificationRef;
import org.learningequality.task.Worker;
import org.kivy.android.PythonWorker;

import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;

final public class ForegroundWorker extends RemoteListenableWorker implements Worker {
    private static final String TAG = "Kolibri.ForegroundWorker";
    private final PythonWorker workerImpl;

    public ForegroundWorker(
            @NonNull android.content.Context context,
            @NonNull androidx.work.WorkerParameters workerParams
    ) {
        super(context, workerParams);
        workerImpl = new PythonWorker(context, "TaskWorker", "taskworker.py");
    }

    @SuppressLint("RestrictedApi")
    @Override
    @NonNull
    public ListenableFuture<Result> startRemoteWork() {
        Log.d(TAG, "Running foreground remote task " + getId());
        final SettableFuture<Result> future = SettableFuture.create();
        final String id = getId().toString();
        final String arg = getArgument();

        // See executor defined in configuration
        final ThreadPoolExecutor executor = (ThreadPoolExecutor) getBackgroundExecutor();
        // This is somewhat similar to what the plain `Worker` class does, except that we
        // use `submit` instead of `execute` so we can propagate cancellation
        // See https://android.googlesource.com/platform/frameworks/support/+/60ae0eec2a32396c22ad92502cde952c80d514a0/work/workmanager/src/main/java/androidx/work/Worker.java
        final Future<?> threadFuture = executor.submit(() -> {
            try {
                Result r = workerImpl.execute(id, arg) ? Result.success() : Result.failure();
                future.set(r);
            } catch (Exception e) {
                Log.e(TAG, "Exception in remote python work for " + id, e);
                future.setException(e);
            }
        });

        // If `RunnableFuture` was a `ListenableFuture` we could simply use `future.setFuture` to
        // propagate the result and cancellation, but instead add listener to propagate
        // cancellation to python thread, using the task executor which should invoke this in the
        // main thread (where this was originally called from)
        future.addListener(() -> {
            synchronized (future) {
                if (future.isCancelled()) {
                    Log.i(TAG, "Interrupting python thread");
                    synchronized (threadFuture) {
                        threadFuture.cancel(true);
                    }
                }

                if (future.isDone()) {
                    hideNotification();
                }
            }
        }, getTaskExecutor().getMainThreadExecutor());
        return future;
    }

    @Override
    public void onStopped() {
        Log.d(TAG, "Stopping foreground remote task " + getId());
        super.onStopped();
        hideNotification();
    }

    public ForegroundInfo getForegroundInfo() {
        NotificationRef ref = WorkerService.buildNotificationRef();
        Builder builder = new Builder(getApplicationContext(), ref);
        // If API level is at least 29
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            return new ForegroundInfo(
                    ref.getId(),
                    builder.build(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST
            );
        }

        return new ForegroundInfo(ref.getId(), builder.build());
    }

    @Override
    @NonNull
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture(completer -> completer.set(getForegroundInfo()));
    }
}
