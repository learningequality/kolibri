package org.learningequality;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkInfo;
import androidx.work.WorkQuery;
import androidx.work.multiprocess.RemoteWorkManager;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.TaskworkerWorker;
import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.sqlite.Database;
import org.learningequality.sqlite.query.SelectQuery;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import java9.util.concurrent.CompletableFuture;


public class Task {
    public static final String TAG = "Task";
    public static final String PREFIX_TASK_ID = "kolibri_task_id:";

    public enum StateMap {
        MISSING(null),
        PENDING(
                JobStorage.Jobs.State.PENDING,
                WorkInfo.State.ENQUEUED,
                WorkInfo.State.BLOCKED
        ),
        QUEUED(
                JobStorage.Jobs.State.QUEUED,
                WorkInfo.State.ENQUEUED,
                WorkInfo.State.BLOCKED
        ),
        SCHEDULED(
                JobStorage.Jobs.State.SCHEDULED,
                WorkInfo.State.ENQUEUED,
                WorkInfo.State.BLOCKED
        ),
        SELECTED(
                JobStorage.Jobs.State.SELECTED,
                WorkInfo.State.ENQUEUED,
                WorkInfo.State.BLOCKED,
                WorkInfo.State.RUNNING
        ),
        RUNNING(JobStorage.Jobs.State.RUNNING, WorkInfo.State.RUNNING),
        CANCELING(JobStorage.Jobs.State.CANCELING, WorkInfo.State.CANCELLED),
        CANCELED(JobStorage.Jobs.State.CANCELED, WorkInfo.State.CANCELLED),
        FAILED(JobStorage.Jobs.State.FAILED, WorkInfo.State.FAILED),
        COMPLETED(JobStorage.Jobs.State.COMPLETED, WorkInfo.State.SUCCEEDED);

        private final JobStorage.Jobs.State jobState;
        private final WorkInfo.State[] workInfoStates;

        StateMap(JobStorage.Jobs.State jobState, WorkInfo.State... workInfoStates) {
            this.jobState = jobState;
            this.workInfoStates = workInfoStates;
        }

        public JobStorage.Jobs.State getJobState() {
            return this.jobState;
        }

        public WorkInfo.State[] getWorkInfoStates() {
            return this.workInfoStates;
        }
    }


    private static String generateTagFromId(String id) {
        return PREFIX_TASK_ID + id;
    }

    private static String generateTagFromJobFunc(String jobFunc) {
        return "kolibri_job_type:" + jobFunc;
    }

    public static String enqueueOnce(String id, int delay, boolean expedite, String jobFunc, boolean longRunning) {
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(ContextUtil.getApplicationContext());
        Data data = TaskworkerWorker.buildInputData(id);

        OneTimeWorkRequest.Builder workRequestBuilder = new OneTimeWorkRequest.Builder(TaskworkerWorker.class);

        // Tasks can only be expedited if they are set with no delay.
        // This does not appear to be documented, but is evident in the Android Jetpack source code.
        // https://android.googlesource.com/platform/frameworks/support/+/HEAD/work/work-runtime/src/main/java/androidx/work/WorkRequest.kt#271
        if (expedite && delay == 0) {
            workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        }

        if (delay > 0) {
            workRequestBuilder.setInitialDelay(delay, TimeUnit.SECONDS);
        }
        workRequestBuilder.addTag(generateTagFromId(id));
        workRequestBuilder.addTag(generateTagFromJobFunc(jobFunc));
        if (longRunning) {
            workRequestBuilder.addTag(TaskworkerWorker.TAG_LONG_RUNNING);
            Log.v(TAG, "Tagging work request as long running, ID: " + id);
        }
        workRequestBuilder.setInputData(data);
        workRequestBuilder.setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.SECONDS);
        OneTimeWorkRequest workRequest = workRequestBuilder.build();
        workManager.enqueueUniqueWork(id, ExistingWorkPolicy.APPEND_OR_REPLACE, workRequest);
        // return the work request ID, different from the task ID passed in
        return workRequest.getId().toString();
    }

    protected static WorkQuery buildWorkQuery(String... jobIds) {
        return WorkQuery.Builder
                .fromUniqueWorkNames(Arrays.asList(jobIds))
                .build();
    }

    protected static WorkQuery buildWorkQuery(UUID... requestIds) {
        return WorkQuery.Builder
                .fromIds(Arrays.asList(requestIds))
                .build();
    }

    public static void clear(String id) {
        Context context = ContextUtil.getApplicationContext();
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);
        WorkQuery workQuery = buildWorkQuery(id);
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
        CompletableFuture<Boolean> future = new CompletableFuture<>();
        if (executor == null) {
            executor = ContextCompat.getMainExecutor(context);
        }

        try (Task.Sentinel sentinel = new Task.Sentinel(context, executor)) {
            CompletableFuture<Void> f = CompletableFuture.allOf(
                    sentinel.check(Task.StateMap.PENDING),
                    sentinel.check(Task.StateMap.QUEUED),
                    sentinel.check(Task.StateMap.SCHEDULED),
                    sentinel.check(Task.StateMap.SELECTED),
                    sentinel.check(Task.StateMap.RUNNING)
            );

            f.whenCompleteAsync((result, throwable) -> {
                if (throwable != null) {
                    Log.w(Sentinel.TAG, "Reconciliation encountered an error");
                    future.completeExceptionally(throwable);
                } else {
                    Log.i(Sentinel.TAG, "Reconciliation completed successfully");
                    future.complete(true);
                }
            }, executor);
        }

        return future;
    }

    /**
     * Sentinel (as in watcher) for checking and reconciling Kolibri job status with WorkManager
     */
    public static class Sentinel implements AutoCloseable {
        public static String TAG = "KolibriTask.Sentinel";
        private final RemoteWorkManager workManager;
        private final Database db;
        private final Executor executor;


        public Sentinel(Context context, Executor executor) {
            workManager = RemoteWorkManager.getInstance(context);
            db = Database.readonly(context, JobStorage.DATABASE_NAME);
            this.executor = executor;
        }

        /**
         * Create a sentinel with the main thread executor
         */
        public Sentinel(Context context) {
            this(context, ContextCompat.getMainExecutor(context));
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
                return Task.buildWorkQuery(id);
            }

            return Task.buildWorkQuery(UUID.fromString(requestId));
        }

        /**
         * Check for jobs with the given status and reconcile them with WorkManager
         * Defaults to flagging missing work in WorkManager
         *
         * @param stateRef The job status in the Kolibri database for which to find jobs
         * @return A future that will complete when all jobs have been checked, with a list of jobs
         */
        public CompletableFuture<Bundle[]> check(StateMap stateRef) {
            return check(false, stateRef);
        }

        /**
         * Check for jobs with the given status and reconcile them with WorkManager
         * @param ignoreMissing Whether to ignore missing work in WorkManager
         * @param stateRef The job status in the Kolibri database for which to find jobs
         * @return A future that will complete when all jobs have been checked, with a list of jobs
         */
        public CompletableFuture<Bundle[]> check(
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
        public CompletableFuture<Bundle[]> check(
                Bundle[] jobs,
                boolean ignoreMissing,
                WorkInfo.State... expectedWorkStates
        ) {
            final List<CompletableFuture<Bundle>> jobFutures = new ArrayList<CompletableFuture<Bundle>>(jobs.length);

            for (Bundle job : jobs) {
                CompletableFuture<Bundle> jobCheck = check(job, ignoreMissing, expectedWorkStates);
                jobFutures.add(jobCheck);
            }

            CompletableFuture<Bundle[]> future = CompletableFuture.allOf(
                    jobFutures.toArray(new CompletableFuture[0])
            )
                .thenApply((result) -> {
                    final List<Bundle> allResults = new ArrayList<Bundle>(jobs.length);
                    for (CompletableFuture<Bundle> jobFuture : jobFutures) {
                        // Add all the results from the job futures
                        try {
                            Bundle jobResult = jobFuture.get();
                            if (jobResult != null) {
                                allResults.add(jobResult);
                            }
                        } catch (ExecutionException | InterruptedException e) {
                            e.printStackTrace();
                        }
                    }
                    return allResults.toArray(new Bundle[0]);
                });

            future.whenComplete((result, ex) -> {
                if (future.isCancelled()) {
                    for (CompletableFuture<Bundle> jobFuture : jobFutures) {
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
        public CompletableFuture<Bundle> check(
                Bundle job,
                boolean ignoreMissing,
                WorkInfo.State... expectedWorkStates
        ) {
            CompletableFuture<Bundle> future = new CompletableFuture<>();

            List<WorkInfo.State> workStates = Arrays.asList(expectedWorkStates);
            WorkQuery workQuery = buildWorkQuery(job);
            ListenableFuture<List<WorkInfo>> workInfosFuture = workManager.getWorkInfos(workQuery);

            workInfosFuture.addListener(() -> {
                boolean checkFailed = false;
                try {
                    List<WorkInfo> workInfos = workInfosFuture.get();

                    if (workInfos == null || workInfos.size() == 0) {
                        if (ignoreMissing) {
                            return;
                        }

                        Log.w(TAG, "No work requests found for job id " + JobStorage.Jobs.id.getValue(job));
                        checkFailed = true;
                    } else {
                        for (WorkInfo workInfo : workInfos) {
                            WorkInfo.State state = workInfo.getState();

                            if (!workStates.contains(state)) {
                                Log.w(TAG, "WorkInfo state " + state + " does not match expected state " + Arrays.toString(expectedWorkStates) + " for request " + workInfo.getId() + " | " + workInfo.getTags());
                                checkFailed = true;
                            }
                        }
                    }
                }
                catch (ExecutionException | InterruptedException e) {
                    e.printStackTrace();
                } finally {
                    if (checkFailed) {
                        future.complete(job);
                    } else {
                        future.complete(null);
                    }
                }
            }, executor);

            future.whenComplete((result, ex) -> {
                if (future.isCancelled()) {
                    workInfosFuture.cancel(true);
                }
            });

            return future;
        }

        public void close() {
            db.close();
        }
    }
}
