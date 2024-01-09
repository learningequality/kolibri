package org.learningequality.Kolibri;

import android.annotation.SuppressLint;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.ListenableWorker;
import androidx.work.WorkerParameters;
import androidx.work.impl.utils.futures.SettableFuture;

import com.google.common.util.concurrent.ListenableFuture;

import java9.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.learningequality.Task;

public class ReconcileWorker extends ListenableWorker {
    public static final String TAG = "Kolibri.ReconcileWorker";

    public ReconcileWorker(@NonNull Context appContext, @NonNull WorkerParameters workerParams) {
        super(appContext, workerParams);
    }

    @SuppressLint("RestrictedApi")
    @NonNull
    public ListenableFuture<Result> startWork() {
        Log.i(TAG, "Starting reconcile task");
        SettableFuture<Result> future = SettableFuture.create();
        Executor executor = getBackgroundExecutor();

        boolean result = Task.reconcile(getApplicationContext(), executor);
        if (!result) {
            Log.e(TAG, "Failed to reconcile tasks");
            future.set(Result.failure());
            return future;
        }
        future.set(Result.success());
        return future;
    }
}
