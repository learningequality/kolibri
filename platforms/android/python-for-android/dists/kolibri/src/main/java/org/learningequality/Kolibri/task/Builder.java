package org.learningequality.Kolibri.task;

import android.os.Bundle;
import android.util.Log;

import androidx.work.Data;
import androidx.work.ListenableWorker;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkInfo;
import androidx.work.WorkQuery;

import org.learningequality.Kolibri.BackgroundWorker;
import org.learningequality.Kolibri.ForegroundWorker;
import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.task.Worker;

import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.TimeUnit;


/**
 * A builder class consolidating logic for creating WorkRequests and WorkQueries
 */
public class Builder {
    public static final String TAG = "Kolibri.TaskBuilder";

    public static final String TAG_PREFIX_TASK_ID = "kolibri_task_id:";
    public static final String TAG_PREFIX_JOB_FUNC = "kolibri_job_type:";
    public static final String TAG_EXPEDITED = "kolibri_job_expedited";
    public static final String TAG_LONG_RUNNING = "kolibri_job_long_running";

    public static String generateTagFromId(String id) {
        return TAG_PREFIX_TASK_ID + id;
    }

    public static String generateTagFromJobFunc(String jobFunc) {
        return TAG_PREFIX_JOB_FUNC + jobFunc;
    }

    /**
     * A builder class for creating WorkQueries
     */
    public static class TaskQuery {
        private final WorkQuery.Builder builder;

        public TaskQuery(WorkQuery.Builder builder) {
            this.builder = builder;
        }

        public static TaskQuery from(String... jobIds) {
            return new TaskQuery(WorkQuery.Builder.fromUniqueWorkNames(Arrays.asList(jobIds)));
        }

        public static TaskQuery from(UUID... requestIds) {
            return new TaskQuery(WorkQuery.Builder.fromIds(Arrays.asList(requestIds)));
        }

        public WorkQuery build() {
            return this.builder.build();
        }
    }

    /**
     * A builder class for creating WorkRequests
     * Unfortunately, OneTimeWorkRequest.Builder is final so we cannot extend it.
     */
    public static class TaskRequest {
        private final String id;
        private String jobFunc;
        private boolean longRunning;
        private int delay;
        private boolean expedite;

        public TaskRequest(String id) {
            this.id = id;
            setDelay(0);
        }

        /**
         * Creates a TaskRequest builder from a job Bundle, like that returned by JobStorage
         *
         * @param job The existing job Bundle from which to parse task information
         * @return A TaskRequest builder
         */
        public static TaskRequest fromJob(Bundle job) {
            String id = JobStorage.Jobs.id.getValue(job);
            Long priority = JobStorage.Jobs.priority.getValue(job);

            TaskRequest builder = new TaskRequest(id);
            return builder.setJobFunc(JobStorage.Jobs.func.getValue(job))
                    .setExpedite(JobStorage.Jobs.Priority.HIGH.isAtLeast(priority));
        }

        /**
         * Creates a TaskRequest builder from an existing WorkInfo object
         *
         * @param workInfo The existing WorkInfo from which to parse task information
         * @return A TaskRequest builder
         */
        public static TaskRequest fromWorkInfo(WorkInfo workInfo) {
            String id = null;
            String jobFunc = null;
            boolean expedite = false;
            boolean isLongRunning = false;

            for (String tag : workInfo.getTags()) {
                if (tag.startsWith(TAG_PREFIX_TASK_ID)) {
                    id = tag.substring(TAG_PREFIX_TASK_ID.length());
                } else if (tag.startsWith(TAG_PREFIX_JOB_FUNC)) {
                    jobFunc = tag.substring(TAG_PREFIX_JOB_FUNC.length());
                } else if (tag.equals(TAG_EXPEDITED)) {
                    expedite = true;
                } else if (tag.equals(TAG_LONG_RUNNING)) {
                    isLongRunning = true;
                }
            }

            if (id == null || jobFunc == null) {
                throw new IllegalArgumentException("WorkInfo is missing required task info");
            }

            return (new TaskRequest(id))
                    .setJobFunc(jobFunc)
                    .setExpedite(expedite)
                    .setLongRunning(isLongRunning);
        }

        public String getId() {
            return this.id;
        }

        public TaskRequest setDelay(int delay) {
            this.delay = delay;
            return this;
        }

        public TaskRequest setExpedite(boolean expedite) {
            this.expedite = expedite;
            return this;
        }

        public TaskRequest setJobFunc(String jobFunc) {
            this.jobFunc = jobFunc;
            return this;
        }

        public TaskRequest setLongRunning(boolean longRunning) {
            this.longRunning = longRunning;
            return this;
        }

        private Class<? extends ListenableWorker> getWorkerClass() {
            return longRunning || expedite ? ForegroundWorker.class : BackgroundWorker.class;
        }

        private Data buildInputData() {
            String dataArgument = id == null ? "" : id;
            Data.Builder builder = new Data.Builder()
                    .putString(Worker.ARGUMENT_WORKER_ARGUMENT, dataArgument);
            Data data = builder.build();
            Log.v(TAG, "Worker request data: " + data.toString());
            return data;
        }

        /**
         * Build a one-time WorkRequest from the TaskRequest information
         *
         * @return A OneTimeWorkRequest object
         */
        public OneTimeWorkRequest build() {
            OneTimeWorkRequest.Builder builder = new OneTimeWorkRequest.Builder(getWorkerClass());
            builder.addTag(generateTagFromId(id));
            builder.addTag(generateTagFromJobFunc(jobFunc));
            if (longRunning) {
                builder.addTag(TAG_LONG_RUNNING);
            }
            builder.setInputData(buildInputData());
            if (delay > 0) {
                builder.setInitialDelay(delay, TimeUnit.SECONDS);
            }
            // Tasks can only be expedited if they are set with no delay.
            // This does not appear to be documented, but is evident in the Android Jetpack source code.
            // https://android.googlesource.com/platform/frameworks/support/+/HEAD/work/work-runtime/src/main/java/androidx/work/WorkRequest.kt#271
            if (expedite && delay == 0) {
                builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
                builder.addTag(TAG_EXPEDITED);
            }

            return builder.build();
        }
    }
}
