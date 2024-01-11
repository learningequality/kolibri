package org.learningequality.task;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.util.Pair;

import androidx.work.WorkInfo;
import androidx.work.WorkQuery;
import androidx.work.multiprocess.RemoteWorkManager;

import org.learningequality.FuturesUtil;
import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.sqlite.query.SelectQuery;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;

import java9.util.concurrent.CompletableFuture;

/**
 * Sentinel (as in watcher) for checking and reconciling Kolibri job status with WorkManager
 */
public class Sentinel {
    public static String TAG = "Kolibri.TaskSentinel";
    private final RemoteWorkManager workManager;
    private final JobStorage db;
    private final Executor executor;

    /**
     * A class that holds the pair of Bundle and WorkInfo as a result of the Sentinel's
     * check operations
     */
    public static class Result extends Pair<Bundle, WorkInfo> {
        public Result(Bundle first, WorkInfo second) {
            super(first, second);
        }

        public boolean isMissing() {
            return this.second == null;
        }

        public Bundle getJob() {
            return this.first;
        }

        public WorkInfo getWorkInfo() {
            return this.second;
        }
    }

    public Sentinel(RemoteWorkManager workManager, JobStorage db, Executor executor) {
        this.workManager = workManager;
        this.db = db;
        this.executor = executor;
    }

    /**
     * Create a sentinel
     */
    public static Sentinel from(Context context, JobStorage db, Executor executor) {
        return new Sentinel(
                RemoteWorkManager.getInstance(context),
                db,
                executor
        );
    }

    /**
     * Build a query for jobs with the given status
     *
     * @param jobStatus The job status in the Kolibri database for which to find jobs
     * @return A query for jobs with the given status, and subset of selected columns
     */
    private SelectQuery buildQuery(JobStorage.Jobs.State jobStatus) {
        return new SelectQuery(
                JobStorage.Jobs.id,
                JobStorage.Jobs.priority,
                JobStorage.Jobs.state,
                JobStorage.Jobs.worker_process,
                JobStorage.Jobs.worker_thread,
                JobStorage.Jobs.worker_extra
        )
                .from(JobStorage.Jobs.TABLE_NAME)
                .where(jobStatus)
                .orderBy(JobStorage.Jobs.time_updated, false);
    }

    private WorkQuery buildWorkQuery(Bundle result) {
        String requestId = JobStorage.Jobs.worker_extra.getValue(result);

        if (requestId == null) {
            String id = JobStorage.Jobs.id.getValue(result);
            Log.v(TAG, "No request ID found for job " + id);
            return Builder.TaskQuery.from(id).build();
        }

        return Builder.TaskQuery.from(UUID.fromString(requestId)).build();
    }

    /**
     * Check for jobs with the given status and reconcile them with WorkManager
     * Defaults to flagging missing work in WorkManager
     *
     * @param stateRef The job status in the Kolibri database for which to find jobs
     * @return A future that will complete when all jobs have been checked, with a list of jobs
     */
    public CompletableFuture<Result[]> check(StateMap stateRef) {
        return check(false, stateRef);
    }

    /**
     * Check for jobs with the given status and reconcile them with WorkManager
     * @param ignoreMissing Whether to ignore missing work in WorkManager
     * @param stateRef The job status in the Kolibri database for which to find jobs
     * @return A future that will complete when all jobs have been checked, with a list of jobs
     */
    public CompletableFuture<Result[]> check(
            boolean ignoreMissing,
            StateMap stateRef
    ) {
        Log.d(TAG, "Checking for jobs in state " + stateRef.getJobState());
        SelectQuery query = buildQuery(stateRef.getJobState());
        Bundle[] jobs = query.execute(db);

        if (jobs == null || jobs.length == 0) {
            Log.v(TAG, "No jobs to reconcile for status " + stateRef);
            return CompletableFuture.completedFuture(null);
        }

        Log.d(TAG, "Cross-referencing " + jobs.length + " jobs with work manager");
        return check(jobs, ignoreMissing, stateRef.getWorkInfoStates());
    }

    /**
     * Check for the given jobs (Bundles) and reconciles them with WorkManager
     *
     * @param jobs The jobs to check
     * @param ignoreMissing Whether to ignore missing work in WorkManager
     * @param expectedWorkStates The expected WorkManager states for the found jobs
     * @return A future that will complete when all jobs have been checked, with a list of jobs
     */
    public CompletableFuture<Result[]> check(
            Bundle[] jobs,
            boolean ignoreMissing,
            WorkInfo.State... expectedWorkStates
    ) {
        final CompletableFuture<Result[]> future = new CompletableFuture<>();
        final List<Result> allResults = new ArrayList<Result>(jobs.length);
        CompletableFuture<List<Result>> chain = CompletableFuture.completedFuture(allResults);

        for (Bundle job : jobs) {
            chain = chain.thenComposeAsync((results) -> {
                synchronized (future) {
                    if (future.isCancelled()) {
                        return CompletableFuture.completedFuture(results);
                    }
                }

                return check(job, ignoreMissing, expectedWorkStates)
                        .exceptionally((ex) -> {
                            Log.e(TAG, "Failed to check job '" + JobStorage.Jobs.id.getValue(job) + "'", ex);
                            return null;
                        })
                        .thenApply((result) -> {
                            if (result != null) {
                                results.add(result);
                            }
                            return results;
                        });
            }, executor);
        }

        chain.whenCompleteAsync((results, ex) -> {
            if (ex != null) {
                Log.e(TAG, "Failed to check jobs", ex);
                future.completeExceptionally(ex);
                return;
            }

            synchronized (future) {
                if (!future.isCancelled()) {
                    future.complete(results.toArray(new Result[0]));
                }
            }
        }, executor);
        return future;
    }

    /**
     * Check for the given job (Bundle) and reconciles it with WorkManager
     *
     * @param job The job to check as a `Bundle`
     * @param ignoreMissing Whether to ignore the job as missing in WorkManager
     * @param expectedWorkStates The expected WorkManager states for the found jobs
     * @return A future that will complete when the job has been checked, with the job if it is not reconciled
     */
    public CompletableFuture<Result> check(
            Bundle job,
            boolean ignoreMissing,
            WorkInfo.State... expectedWorkStates
    ) {
        final String jobId = JobStorage.Jobs.id.getValue(job);
        Log.d(TAG, "Cross-referencing job '" + jobId + "' with work manager");

        List<WorkInfo.State> workStates = Arrays.asList(expectedWorkStates);
        WorkQuery workQuery = buildWorkQuery(job);

        return FuturesUtil.toCompletable(workManager.getWorkInfos(workQuery), executor)
                .thenApplyAsync((workInfos) -> {
                    Log.d(TAG, "Completed cross-reference of job '" + jobId + "'");

                    if (workInfos == null || workInfos.size() == 0) {
                        if (ignoreMissing) {
                            return null;
                        }

                        Log.w(TAG, "No work requests found for job id '" + jobId + "'");
                        return new Result(job, null);
                    }

                    for (WorkInfo workInfo : workInfos) {
                        WorkInfo.State state = workInfo.getState();

                        if (!workStates.contains(state)) {
                            Log.w(TAG, "WorkInfo state " + state + " does not match expected state " + Arrays.toString(expectedWorkStates) + " for request " + workInfo.getId() + " | " + workInfo.getTags());
                            return new Result(job, workInfo);
                        }
                    }

                    return null;
                }, executor);
    }
}
