package org.learningequality.task;

import androidx.work.WorkInfo;

import org.learningequality.Kolibri.sqlite.JobStorage;

/**
 * A mapping between Kolibri job states and WorkManager work states
 */
public enum StateMap {
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
    // We include 'ENQUEUED' here because it is possible for a job to be re-enqueued by the
    // reconciler while Kolibri thinks it's running
    RUNNING(
            JobStorage.Jobs.State.RUNNING,
            WorkInfo.State.ENQUEUED,
            WorkInfo.State.RUNNING,
            WorkInfo.State.SUCCEEDED
    );

    private final JobStorage.Jobs.State jobState;
    private final WorkInfo.State[] workInfoStates;

    StateMap(JobStorage.Jobs.State jobState, WorkInfo.State... workInfoStates) {
        this.jobState = jobState;
        this.workInfoStates = workInfoStates;
    }

    public static StateMap[] forReconciliation() {
        return new StateMap[]{
                PENDING,
                QUEUED,
                SCHEDULED,
                SELECTED,
                RUNNING
        };
    }

    public JobStorage.Jobs.State getJobState() {
        return this.jobState;
    }

    public WorkInfo.State[] getWorkInfoStates() {
        return this.workInfoStates;
    }
}
