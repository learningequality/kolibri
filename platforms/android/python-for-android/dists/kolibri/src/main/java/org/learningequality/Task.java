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
import org.learningequality.task.Reconciler;
import org.learningequality.task.Sentinel;
import org.learningequality.task.StateMap;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

import java9.util.concurrent.CompletableFuture;


public class Task {
    public static final String TAG = "Kolibri.Task";

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
        WorkQuery workQuery = Builder.TaskQuery.from(id).build();
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

    public static CompletableFuture<Boolean> reconcile(Context context, Executor executor) {
        if (executor == null) {
            executor = ContextCompat.getMainExecutor(context);
        }

        final AtomicBoolean didReconcile = new AtomicBoolean(false);
        final JobStorage db = JobStorage.readwrite(context);
        final Reconciler reconciler = Reconciler.from(context, db, executor);

        if (db == null) {
            Log.e(Sentinel.TAG, "Failed to open job storage database");
            return CompletableFuture.completedFuture(false);
        }

        // If we can't acquire the lock, then reconciliation is already running
        if (!reconciler.begin()) {
            return CompletableFuture.completedFuture(false);
        }

        final Sentinel sentinel = Sentinel.from(context, db, executor);
        final CompletableFuture<Boolean> future = new CompletableFuture<>();
        CompletableFuture<AtomicBoolean> chain = CompletableFuture.completedFuture(didReconcile);

        // Run through all the states and check them, then process the results
        for (StateMap stateRef : StateMap.forReconciliation()) {
            chain = chain.thenComposeAsync((_didReconcile) -> {
                // Avoid checking if future is cancelled
                synchronized (future) {
                    if (future.isCancelled()) {
                        return CompletableFuture.completedFuture(_didReconcile);
                    }
                }

                Log.i(TAG, "Requesting sentinel check state " + stateRef);
                return sentinel.check(stateRef)
                        .exceptionally((e) -> {
                            Log.e(TAG, "Failed to check state for reconciliation " + stateRef, e);
                            return null;
                        })
                        .thenCompose((results) -> {
                            if (results != null && results.length > 0) {
                                Log.d(TAG, "Received results for sentinel checking " + stateRef);
                                _didReconcile.set(true);
                                return reconciler.process(stateRef, results)
                                        .thenApply((r) -> _didReconcile);
                            }
                            return CompletableFuture.completedFuture(_didReconcile);
                        });
            }, executor);
        }

        final CompletableFuture<AtomicBoolean> finalChain
                = chain.orTimeout(15, java.util.concurrent.TimeUnit.SECONDS);

        finalChain.whenCompleteAsync((result, error) -> {
            try {
                reconciler.end();
                db.close();
            } catch (Exception e) {
                Log.e(TAG, "Failed cleaning up reconciliation", e);
            } finally {
                synchronized (future) {
                    if (!future.isCancelled()) {
                        if (error instanceof TimeoutException) {
                            Log.e(TAG, "Timed out waiting for reconciliation chain", error);
                            future.completeExceptionally(error);
                        } else if (error != null) {
                            Log.e(TAG, "Failed during reconciliation chain", error);
                            future.completeExceptionally(error);
                        } else if (result != null) {
                            if (result.get()) {
                                Log.i(TAG, "Reconciliation completed successfully");
                            } else {
                                Log.i(TAG, "No reconciliation performed");
                            }
                            future.complete(result.get());
                        } else {
                            future.complete(false);
                        }
                    }
                }
            }
        }, executor);

        // Propagate cancellation to the chain
        future.whenCompleteAsync((result, error) -> {
            synchronized (future) {
                if (future.isCancelled()) {
                    finalChain.cancel(true);
                }
            }
        }, executor);

        return future;
    }
}
