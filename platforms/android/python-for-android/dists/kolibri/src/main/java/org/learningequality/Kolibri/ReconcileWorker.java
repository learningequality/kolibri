package org.learningequality.Kolibri;

import android.annotation.SuppressLint;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.WorkerParameters;
import androidx.work.impl.utils.futures.SettableFuture;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import java.util.concurrent.Executor;

import org.learningequality.Task;

public class ReconcileWorker extends RemoteListenableWorker {
    public static final String TAG = "Kolibri.ReconcileWorker";

    public ReconcileWorker(@NonNull Context appContext, @NonNull WorkerParameters workerParams) {
        super(appContext, workerParams);
    }

    @SuppressLint("RestrictedApi")
    @NonNull
    public ListenableFuture<Result> startRemoteWork() {
        Log.i(TAG, "Starting reconcile task");
        SettableFuture<Result> future = SettableFuture.create();
        Executor executor = getBackgroundExecutor();

        Task.reconcile(getApplicationContext(), executor)
                .whenCompleteAsync((result, error) -> {
                    if (error != null) {
                        Log.e(TAG, "Failed to reconcile tasks", error);
                        future.set(Result.failure());
                    } else {
                        future.set(Result.success());
                    }
                }, executor);

        return future;
    }

    public static Data buildInputData() {
        return new Data.Builder()
                .putString(ARGUMENT_PACKAGE_NAME, "org.learningequality.Kolibri")
                .putString(ARGUMENT_CLASS_NAME,
                        TaskworkerWorkerService.class.getName())
                .build();
    }
}
