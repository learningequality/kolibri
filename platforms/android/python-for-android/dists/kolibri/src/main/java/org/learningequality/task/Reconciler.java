package org.learningequality.task;

import android.content.Context;
import android.util.Log;

import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.multiprocess.RemoteWorkManager;

import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.sqlite.query.UpdateQuery;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.util.UUID;


public class Reconciler implements AutoCloseable {
    public static final String TAG = "KolibriTask.Reconciler";
    public static final String LOCK_FILE = "kolibri_reconciler.lock";

    private final RemoteWorkManager workManager;
    private final FileChannel lockChannel;
    private final JobStorage db;
    private FileLock lock;

    public Reconciler(RemoteWorkManager workManager, JobStorage db, File lockFile) {
        this.workManager = workManager;
        this.db = db;
        try {
            lockChannel = new RandomAccessFile(lockFile, "rw").getChannel();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Create a new Reconciler instance from a Context
     * @param context The context to use
     * @return A new Reconciler instance
     */
    public static Reconciler from(Context context, JobStorage db) {
        File lockFile = new File(context.getFilesDir(), LOCK_FILE);
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);
        return new Reconciler(workManager, db, lockFile);
    }

    /**
     * Attempt to acquire an exclusive lock on the lock file, which will prevent multiple
     * Reconciler instances from running at the same time, including in different processes.
     * Also starts a transaction on the database.
     * @return True if the lock was acquired, false otherwise
     */
    public boolean begin() {
        // First get a lock on the lock file
        try {
            Log.d(TAG, "Acquiring lock");
            lock = lockChannel.tryLock();
            if (lock == null) {
                Log.d(TAG, "Failed to acquire lock");
                return false;
            }
        } catch (IOException e) {
            Log.e(TAG, "Failed to acquire lock", e);
            return false;
        }

        // Then start a transaction
        Log.d(TAG, "Beginning transaction");
        db.begin();
        return true;
    }

    /**
     * Commit the database transaction and release the lock
     */
    public void end() {
        Log.d(TAG, "Committing transaction");
        db.commit();

        try {
            Log.d(TAG, "Releasing lock");
            if (lock != null) lock.release();
            lockChannel.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to close and release lock", e);
        }
    }

    /**
     * Close the Reconciler, rolling back the database transaction and releasing the lock
     */
    public void close() {
        // this may be a no-op if closing normally
        db.rollback();
        end();
    }

    /**
     * (Re)enqueue a WorkRequest from a Sentinel.Result
     * @param result The result of a Sentinel check operation
     */
    protected void enqueueFrom(Sentinel.Result result) {
        // We prefer to create the builder from the WorkInfo, if it exists
        Builder.TaskRequest builder = (result.isMissing())
                ? Builder.TaskRequest.fromJob(result.getJob())
                : Builder.TaskRequest.fromWorkInfo(result.getWorkInfo());


        if (result.isMissing()) {
            // if we're missing the WorkInfo, then we can't know if it's supposed to be long running,
            // because we don't track `long_running` in the DB, so we can only assume
            builder.setLongRunning(true)
                   .setDelay(0);
        }

        Log.d(TAG, "Re-enqueuing job " + builder.getId());
        OneTimeWorkRequest req = builder.build();
        // Using `REPLACE` here because we want to replace the existing request as a more
        // forceful way of ensuring that the request is enqueued, since this is reconciliation
        workManager.enqueueUniqueWork(builder.getId(), ExistingWorkPolicy.REPLACE, req);
        if (updateRequestId(builder.getId(), req.getId()) == 0) {
            Log.e(TAG, "Failed to update request ID for job " + builder.getId());
        }
    }

    /**
     * Update the request ID for a job in the database
     * @param id The job ID
     * @param requestId The new WorkManager request ID
     * @return The number of rows updated
     */
    protected int updateRequestId(String id, UUID requestId) {
        Log.d(TAG, "Updating request ID for job " + id + " to " + requestId);
        UpdateQuery q = new UpdateQuery(JobStorage.Jobs.TABLE_NAME)
                .where(JobStorage.Jobs.id, id)
                .set(JobStorage.Jobs.worker_extra, requestId.toString());
        return q.execute(db);
    }

    /**
     * Process results from Sentinel checks that found jobs in the given state didn't match
     * the expected WorkManager state, or were missing
     * @param stateRef The state which Kolibri thinks the job is in
     * @param results The results of the Sentinel checks
     */
    public void process(StateMap stateRef, Sentinel.Result[] results) {
        Log.d(TAG, "Reconciling " + results.length + " jobs for state " + stateRef);

        for (Sentinel.Result result : results) {
            switch (stateRef.getJobState()) {
                case PENDING:
                case QUEUED:
                case SCHEDULED:
                case SELECTED:
                case RUNNING:
                    enqueueFrom(result);
                    break;
                default:
                    Log.d(TAG, "No reconciliation for state " + stateRef.getJobState());
                    break;
            }
        }
    }
}
