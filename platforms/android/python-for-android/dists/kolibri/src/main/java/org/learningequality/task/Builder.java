package org.learningequality.task;

import android.os.Bundle;

import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkInfo;
import androidx.work.WorkQuery;

import org.learningequality.Kolibri.TaskworkerWorker;
import org.learningequality.Kolibri.sqlite.JobStorage;


/**
 * A builder class consolidating logic for creating WorkRequests and WorkQueries
 */
public class Builder {
    public static final String TAG = "KolibriTask.Builder";

    public static final String TAG_PREFIX_TASK_ID = "kolibri_task_id:";
    public static final String TAG_PREFIX_JOB_FUNC = "kolibri_job_type:";
    public static final String TAG_EXPEDITED = "kolibri_job_expedited";

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

        public WorkQuery build() {
            return this.builder.build();
        }

        public static TaskQuery from(String... jobIds) {
            return new TaskQuery(WorkQuery.Builder.fromUniqueWorkNames(Arrays.asList(jobIds)));
        }

        public static TaskQuery from(UUID... requestIds) {
            return new TaskQuery(WorkQuery.Builder.fromIds(Arrays.asList(requestIds)));
        }
    }

    /**
     * A builder class for creating WorkRequests
     * Unfortunately, OneTimeWorkRequest.Builder is final so we cannot extend it.
     */
    public static class TaskRequest {
        private final String id;
        private final OneTimeWorkRequest.Builder builder;
        private int delay;
        private boolean expedite;

        public TaskRequest(String id) {
            this.id = id;
            builder = new OneTimeWorkRequest.Builder(TaskworkerWorker.class);
            builder.addTag(generateTagFromId(id));
            builder.setInputData(TaskworkerWorker.buildInputData(id));
            setDelay(0);
        }

        public String getId() {
            return this.id;
        }


        public TaskRequest setDelay(int delay) {
            this.delay = delay;
            if (delay > 0) {
                builder.setInitialDelay(delay, TimeUnit.SECONDS);
            }
            return this;
        }

        public TaskRequest setExpedite(boolean expedite) {
            this.expedite = expedite;
            return this;
        }

        public TaskRequest setJobFunc(String jobFunc) {
            this.builder.addTag(generateTagFromJobFunc(jobFunc));
            return this;
        }

        public TaskRequest setLongRunning(boolean longRunning) {
            if (longRunning) builder.addTag(TaskworkerWorker.TAG_LONG_RUNNING);
            return this;
        }

        /**
         * Build a one-time WorkRequest from the TaskRequest information
         * @return A OneTimeWorkRequest object
         */
        public OneTimeWorkRequest build() {
            // Tasks can only be expedited if they are set with no delay.
            // This does not appear to be documented, but is evident in the Android Jetpack source code.
            // https://android.googlesource.com/platform/frameworks/support/+/HEAD/work/work-runtime/src/main/java/androidx/work/WorkRequest.kt#271
            if (expedite && delay == 0) {
                builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
                builder.addTag(TAG_EXPEDITED);
            }

            return builder.build();
        }

        /**
         * Creates a TaskRequest builder from a job Bundle, like that returned by JobStorage
         * @param job The existing job Bundle from which to parse task information
         * @return A TaskRequest builder
         */
        public static TaskRequest fromJob(Bundle job) {
            String id = JobStorage.Jobs.id.getValue(job);
            int priority = JobStorage.Jobs.priority.getValue(job);

            TaskRequest builder = new TaskRequest(id);
            return builder.setJobFunc(JobStorage.Jobs.func.getValue(job))
                    .setExpedite(priority <= JobStorage.Jobs.Priority.HIGH.getValue());
        }

        /**
         * Creates a TaskRequest builder from an existing WorkInfo object
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
                } else if (tag.equals(TaskworkerWorker.TAG_LONG_RUNNING)) {
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
    }
}
