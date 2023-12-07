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

        CompletableFuture<Boolean> f = Task.reconcile(getApplicationContext(), executor);

        f.whenCompleteAsync((result, throwable) -> {
            if (throwable != null) {
                Log.e(TAG, "Reconcile task failed", throwable);
                future.setException(throwable);
            } else {
                Log.i(TAG, "Reconcile task completed: " + (result ? "success" : "failure"));
                future.set(result ? Result.success() : Result.failure());
            }
        }, executor);

        return future;
    }
}
