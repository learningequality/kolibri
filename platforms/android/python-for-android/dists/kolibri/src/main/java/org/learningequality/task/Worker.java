package org.learningequality.task;

import android.app.Notification;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.WorkerParameters;

import org.kivy.android.PythonProvider;
import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.Kolibri.task.TaskWorkerImpl;
import org.learningequality.notification.Notifier;
import org.learningequality.notification.NotificationRef;
import org.learningequality.sqlite.query.UpdateQuery;

import java.util.UUID;
import java.util.zip.CRC32;

/**
 * Abstract worker class that executes a task worker implementation
 */
abstract public class Worker extends androidx.work.Worker implements Notifier {
    public static String TAG = "Kolibri.BaseWorker";
    public static String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";
    private int lastProgressUpdateHash;
    private Notification lastNotification;


    public Worker(
            @NonNull Context context, @NonNull WorkerParameters workerParams
    ) {
        super(context, workerParams);
    }

    /**
     * Parent worker class will call this method on a background thread automatically
     * when work is to be executed.
     */
    protected abstract WorkerImpl<TaskWorkerImpl.Message> getWorkerImpl();

    /**
     * Parent worker class will call this method on a background thread automatically.
     */
    @Override
    @NonNull
    public Result doWork() {
        final String id = getId().toString();
        final String arg = getArgument();
        Result r;
        Log.d(TAG, "Executing task implementation: " + getId());
        try (WorkerImpl<TaskWorkerImpl.Message> workerImpl = getWorkerImpl()) {
            workerImpl.addObserver(new Observer<TaskWorkerImpl.Message>() {
                @Override
                public void update(TaskWorkerImpl.Message message) {
                    onProgressUpdate(message);
                }
            });
            // Provide context to PythonProvider
            try (PythonProvider ignored = PythonProvider.create(getApplicationContext())) {
                boolean result = workerImpl.execute(id,arg);
                if(!result){
                    if(updateTaskStatus(getArgument(), JobStorage.Jobs.State.FAILED.toString())==0){
                        Log.e(TAG, "Failed to update TaskStatus for remote Task " + getId());
                    };
                }
                r = result ? Result.success() : Result.failure();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error executing task implementation: " + getId(), e);
            r = Result.failure();
        }
        hideNotification();
      return r;
    }

    @Override
    public void onStopped() {
        Log.d(TAG, "Stopping background remote task " + getId());
        // Here we need to update the task in the database to be marked as failed
        if(updateTaskStatus(getArgument(), JobStorage.Jobs.State.CANCELED.toString())==0){
            Log.e(TAG, "Failed to update TaskStatus for remote Task " + getId());
        };
        hideNotification();
        super.onStopped();
    }

    protected int updateTaskStatus(String id, String stateToBeUpdatedTo) {
        int result = 0;
        try (JobStorage db = JobStorage.readwrite(getApplicationContext())){
            if(db!=null){
                Log.d(TAG, "Updating Task Status for job " + id);
                UpdateQuery q = new UpdateQuery(JobStorage.Jobs.TABLE_NAME)
                        .where(JobStorage.Jobs.id, id)
                        .set(JobStorage.Jobs.state, stateToBeUpdatedTo);
                result = q.execute(db);
            }
            Log.e(TAG, "Failed to initialize JobStorage");
        }catch (Exception e){
            Log.e(TAG, "Error managing JobStorage", e);
        }
        return result;
    }


    protected Notification getLastNotification() {
        return lastNotification;
    }

    protected void onProgressUpdate(TaskWorkerImpl.Message message) {
        Data updateData = message.toData();
        // Only update progress if it has changed
        if (updateData.hashCode() == lastProgressUpdateHash) {
            return;
        }
        lastProgressUpdateHash = updateData.hashCode();
        // Logs the data to debug logging
        setProgressAsync(updateData);
        try {
            lastNotification = sendNotification(
                    message.notificationTitle,
                    message.notificationText,
                    message.progress,
                    message.totalProgress
            );
        } catch (Exception e) {
            Log.e(TAG, "Failed to update task progress for: " + getId(), e);
        }
    }

    protected String getArgument() {
        String dataArg = getInputData().getString(ARGUMENT_WORKER_ARGUMENT);
        final String serviceArg;
        if (dataArg != null) {
            serviceArg = dataArg;
        } else {
            serviceArg = "";
        }
        return serviceArg;
    }

    public NotificationRef getNotificationRef() {
        // Use worker request ID as notification tag
        return buildNotificationRef(getId());
    }

    public static NotificationRef buildNotificationRef(UUID id) {
        return buildNotificationRef(id.toString());
    }

    public static NotificationRef buildNotificationRef(String id) {
        // Use CRC32 to generate a unique, integer, notification ID from the string request ID
        CRC32 crc = new CRC32();
        crc.update(id.getBytes());
        int notificationId = (int) crc.getValue();  // Use lower 32 bits (truncates)
        return new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, notificationId);
    }
}
