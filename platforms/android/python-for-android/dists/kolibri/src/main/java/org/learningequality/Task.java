package org.learningequality;

import android.content.Context;

import androidx.core.app.NotificationManagerCompat;
import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;

import org.kivy.android.PythonWorker;
import org.learningequality.Kolibri.TaskworkerWorker;

import java.util.List;
import java.util.concurrent.TimeUnit;


public class Task {
    private static String generateTagFromId(String id) {
        return "kolibri_task_id:" + id;
    }

    private static String generateTagFromJobFunc(String jobFunc) {
        return "kolibri_job_type:" + jobFunc;
    }

    public static void enqueueIndefinitely(String id, int interval, int delay, int retryInterval, boolean expedite, String jobFunc) {
        WorkManager workManager = WorkManager.getInstance(ContextUtil.getApplicationContext());
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
        workRequestBuilder.addTag(generateTagFromId(id));
        workRequestBuilder.addTag(generateTagFromJobFunc(jobFunc));
        workRequestBuilder.setInputData(data);
        PeriodicWorkRequest workRequest = workRequestBuilder.build();
        workManager.enqueueUniquePeriodicWork(id, ExistingPeriodicWorkPolicy.KEEP, workRequest);
    }
    public static void enqueueOnce(String id, int delay, int retryInterval, boolean keep, boolean expedite, String jobFunc) {
        WorkManager workManager = WorkManager.getInstance(ContextUtil.getApplicationContext());
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
        workRequestBuilder.addTag(generateTagFromId(id));
        workRequestBuilder.addTag(generateTagFromJobFunc(jobFunc));
        workRequestBuilder.setInputData(data);
        OneTimeWorkRequest workRequest = workRequestBuilder.build();
        if (keep) {
            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.KEEP, workRequest);
        } else {
            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.APPEND_OR_REPLACE, workRequest);
        }
    }

    public static void clear(String id) {
        Context context = ContextUtil.getApplicationContext();
        String tag = generateTagFromId(id);
        WorkManager workManager = WorkManager.getInstance(context);
        List<WorkInfo> workInfos = workManager.getWorkInfosByTagLiveData(tag).getValue();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        for (WorkInfo workInfo : workInfos) {
            Data progress = workInfo.getProgress();
            int notificationId = progress.getInt(PythonWorker.NOTIFICATION_ID, -1);
            if (notificationId > -1) {
                notificationManager.cancel(notificationId);
            }
        }
        workManager.cancelAllWorkByTag(tag);
    }
}
