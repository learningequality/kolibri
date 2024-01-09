package org.learningequality;

import android.content.Context;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkQuery;
import androidx.work.multiprocess.RemoteWorkManager;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.task.Builder;
import org.learningequality.task.StateMap;
import org.learningequality.task.Sentinel;
import org.learningequality.task.Reconciler;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;

import java9.util.concurrent.CompletableFuture;


public class Task {
    public static final String TAG = "Task";

    public static String enqueueOnce(String id, int delay, boolean expedite, String jobFunc, boolean longRunning) {
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(ContextUtil.getApplicationContext());
        Builder.TaskRequest builder = new Builder.TaskRequest(id);
        builder.setDelay(delay)
                .setExpedite(expedite)
                .setJobFunc(jobFunc)
                .setLongRunning(longRunning);

        OneTimeWorkRequest workRequest = builder.build();
        workManager.enqueueUniqueWork(id, ExistingWorkPolicy.APPEND_OR_REPLACE, workRequest);
        // return the work request ID, different from the task ID passed in
        return workRequest.getId().toString();
    }

    public static void clear(String id) {
        Context context = ContextUtil.getApplicationContext();
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);
        WorkQuery workQuery = (new Builder.TaskQuery(id)).build();
        ListenableFuture<List<WorkInfo>> workInfosFuture = workManager.getWorkInfos(workQuery);

        workInfosFuture.addListener(() -> {
            try {
                List<WorkInfo> workInfos = workInfosFuture.get();
                if (workInfos != null) {
                    // Track whether the work infos are telling us this is clearable
                    boolean clearable = true;
                    // As clearable defaults to true to repeatedly &&
                    // also make sure we actually saw any info at all
                    boolean anyInfo = false;
                    for (WorkInfo workInfo : workInfos) {
                        anyInfo = true;
                        WorkInfo.State state = workInfo.getState();
                        // Clearing a task while it is still running causes some
                        // not great things to happen, so we should wait until
                        // WorkManager has determined it is not running.
                        clearable = clearable && state != WorkInfo.State.RUNNING;
                    }
                    if (anyInfo && clearable) {
                        // If the tasks are marked as completed we
                        workManager.cancelUniqueWork(id);
                    }
                }
            } catch (ExecutionException | InterruptedException e) {
                e.printStackTrace();
            }
        }, new MainThreadExecutor());
    }

     public static boolean reconcile(Context context, Executor executor) {
        if (executor == null) {
            executor = ContextCompat.getMainExecutor(context);
        }

        boolean didReconcile = false;

        try (JobStorage db = JobStorage.readwrite(context)) {
            if (db == null) {
                Log.e(Sentinel.TAG, "Failed to open job storage database");
                return false;
            }

            // Reconciliation needs a lock so we can only have one running at a time
            try (Reconciler reconciler = Reconciler.from(context, db)) {
                // If we can't acquire the lock, then reconciliation is already running
                if (!reconciler.begin()) {
                    return false;
                }

                Sentinel sentinel = Sentinel.from(context, db, executor);

                // Run through all the states and check them, then process the results
                for (StateMap stateRef : StateMap.forReconciliation()) {
                    CompletableFuture<Sentinel.Result[]> stateFuture = sentinel.check(stateRef);
                    Sentinel.Result[] results = null;

                    try {
                        // Wait for the results to come back
                        Log.d(TAG, "Waiting for results for sentinel checking " + stateRef);
                        results = stateFuture.get();
                        Log.d(TAG, "Received results for sentinel checking " + stateRef);
                    } catch (ExecutionException | InterruptedException e) {
                        Log.e(TAG, "Failed to check state for reconciliation " + stateRef, e);
                        continue;
                    }

                    if (results != null && results.length >= 0) {
                        didReconcile = true;
                        reconciler.process(stateRef, results);
                    }
                }

                // If we get here, all the futures completed successfully
                reconciler.end();

                if (didReconcile) {
                    Log.i(Sentinel.TAG, "Reconciliation completed successfully");
                } else {
                    Log.i(Sentinel.TAG, "No reconciliation performed");
                }
            }
        }

        return didReconcile;
    }
}
