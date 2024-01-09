package org.learningequality.task;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.util.Pair;

import androidx.work.WorkInfo;
import androidx.work.WorkQuery;
import androidx.work.multiprocess.RemoteWorkManager;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.sqlite.query.SelectQuery;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;

import java9.util.concurrent.CompletableFuture;

/**
 * Sentinel (as in watcher) for checking and reconciling Kolibri job status with WorkManager
 */
public class Sentinel {
    public static String TAG = "KolibriTask.Sentinel";
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
        final Builder.TaskQuery builder;

        if (requestId == null) {
            String id = JobStorage.Jobs.id.getValue(result);
            Log.v(TAG, "No request ID found for job " + id);
            builder = new Builder.TaskQuery(id);
        } else {
            builder = new Builder.TaskQuery(UUID.fromString(requestId));
        }

        return builder.build();
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
        SelectQuery query = buildQuery(stateRef.getJobState());
        Bundle[] jobs = query.execute(db);

        if (jobs == null || jobs.length == 0) {
            Log.v(TAG, "No jobs to reconcile for status " + stateRef);
            return CompletableFuture.completedFuture(null);
        }

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
        final List<CompletableFuture<Result>> jobFutures = new ArrayList<CompletableFuture<Result>>(jobs.length);

        for (Bundle job : jobs) {
            CompletableFuture<Result> jobCheck = check(job, ignoreMissing, expectedWorkStates);
            jobFutures.add(jobCheck);
        }

        CompletableFuture<Result[]> future = CompletableFuture.allOf(
                        jobFutures.toArray(new CompletableFuture[0])
                )
                .thenApply((result) -> {
                    final List<Result> allResults = new ArrayList<Result>(jobs.length);
                    for (CompletableFuture<Result> jobFuture : jobFutures) {
                        // Add all the results from the job futures
                        try {
                            Result jobResult = jobFuture.get();
                            if (jobResult != null) {
                                allResults.add(jobResult);
                            }
                        } catch (ExecutionException | InterruptedException e) {
                            e.printStackTrace();
                        }
                    }
                    return allResults.toArray(new Result[0]);
                });

        future.whenComplete((result, ex) -> {
            if (future.isCancelled()) {
                for (CompletableFuture<Result> jobFuture : jobFutures) {
                    jobFuture.cancel(true);
                }
            }
        });
        return future;
    }

    /**
     * Check for the given job (Bundle) and reconciles i with WorkManager
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
        CompletableFuture<Result> future = new CompletableFuture<>();

        List<WorkInfo.State> workStates = Arrays.asList(expectedWorkStates);
        WorkQuery workQuery = buildWorkQuery(job);
        ListenableFuture<List<WorkInfo>> workInfosFuture = workManager.getWorkInfos(workQuery);

        workInfosFuture.addListener(() -> {
            Result res = null;
            try {
                List<WorkInfo> workInfos = workInfosFuture.get();

                if (workInfos == null || workInfos.size() == 0) {
                    if (ignoreMissing) {
                        return;
                    }

                    Log.w(TAG, "No work requests found for job id " + JobStorage.Jobs.id.getValue(job));
                    res = new Result(job, null);
                } else {
                    for (WorkInfo workInfo : workInfos) {
                        WorkInfo.State state = workInfo.getState();

                        if (!workStates.contains(state)) {
                            Log.w(TAG, "WorkInfo state " + state + " does not match expected state " + Arrays.toString(expectedWorkStates) + " for request " + workInfo.getId() + " | " + workInfo.getTags());
                            res = new Result(job, workInfo);
                        }
                    }
                }
            }
            catch (ExecutionException | InterruptedException e) {
                e.printStackTrace();
            } finally {
                future.complete(res);
            }
        }, executor);

        future.whenComplete((result, ex) -> {
            if (future.isCancelled()) {
                workInfosFuture.cancel(true);
            }
        });

        return future;
    }
}