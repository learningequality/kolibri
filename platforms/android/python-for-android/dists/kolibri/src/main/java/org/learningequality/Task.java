package org.learningequality;

import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import org.kivy.android.PythonActivity;
import org.learningequality.Kolibri.TaskworkerWorker;

import java.util.concurrent.TimeUnit;


public class Task {
    public static void enqueueIndefinitely(String id, int interval, int delay, int retryInterval, boolean expedite) {
        WorkManager workManager = WorkManager.getInstance(PythonActivity.mActivity);
        Data data = TaskworkerWorker.buildInputData(id);

        PeriodicWorkRequest.Builder workRequestBuilder = new PeriodicWorkRequest.Builder(
            TaskworkerWorker.class, interval, TimeUnit.SECONDS
        );

        if (expedite) {
            workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        }

        if (retryInterval > 0) {
            workRequestBuilder.setBackoffCriteria(
                BackoffPolicy.LINEAR, retryInterval, TimeUnit.SECONDS
            );
        }
        if (delay > 0) {
            workRequestBuilder.setInitialDelay(delay, TimeUnit.SECONDS);
        }
        workRequestBuilder.setInputData(data);
        PeriodicWorkRequest workRequest = workRequestBuilder.build();
        workManager.enqueueUniquePeriodicWork(id, ExistingPeriodicWorkPolicy.KEEP, workRequest);
    }
    public static void enqueueOnce(String id, int delay, int retryInterval, boolean keep, boolean expedite) {
        WorkManager workManager = WorkManager.getInstance(PythonActivity.mActivity);
        Data data = TaskworkerWorker.buildInputData(id);

        OneTimeWorkRequest.Builder workRequestBuilder = new OneTimeWorkRequest.Builder(TaskworkerWorker.class);

        if (expedite) {
            workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        }

        if (retryInterval > 0) {
            workRequestBuilder.setBackoffCriteria(
                BackoffPolicy.LINEAR, retryInterval, TimeUnit.SECONDS
            );
        }
        if (delay > 0) {
            workRequestBuilder.setInitialDelay(delay, TimeUnit.SECONDS);
        }
        workRequestBuilder.setInputData(data);
        OneTimeWorkRequest workRequest = workRequestBuilder.build();
        if (keep) {
            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.KEEP, workRequest);
        } else {
            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.APPEND_OR_REPLACE, workRequest);
        }
    }
}
