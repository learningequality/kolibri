package org.learningequality.task;

import androidx.work.WorkInfo;

import org.learningequality.Kolibri.sqlite.JobStorage;

/**
 * A mapping between Kolibri job states and WorkManager work states
 */
public enum StateMap {
    MISSING(null),
    PENDING(
            JobStorage.Jobs.State.PENDING,
            WorkInfo.State.ENQUEUED,
            WorkInfo.State.BLOCKED,
            WorkInfo.State.RUNNING
    ),
    QUEUED(
            JobStorage.Jobs.State.QUEUED,
            WorkInfo.State.ENQUEUED,
            WorkInfo.State.BLOCKED,
            WorkInfo.State.RUNNING
    ),
    SCHEDULED(
            JobStorage.Jobs.State.SCHEDULED,
            WorkInfo.State.ENQUEUED,
            WorkInfo.State.BLOCKED,
            WorkInfo.State.RUNNING
    ),
    SELECTED(
            JobStorage.Jobs.State.SELECTED,
            WorkInfo.State.ENQUEUED,
            WorkInfo.State.BLOCKED,
            WorkInfo.State.RUNNING
    ),
    RUNNING(JobStorage.Jobs.State.RUNNING, WorkInfo.State.RUNNING, WorkInfo.State.SUCCEEDED),
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

    public static StateMap[] forReconciliation() {
        return new StateMap[] {
                PENDING,
                QUEUED,
                SCHEDULED,
                SELECTED,
                RUNNING
        };
    }
}
