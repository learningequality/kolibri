package org.learningequality;

import android.content.Context;
import android.util.Log;

import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;
import androidx.work.WorkQuery;
import androidx.work.multiprocess.RemoteWorkManager;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.TaskworkerWorker;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;


public class Task {
    public static final String TAG = "Task";

    private static String generateTagFromId(String id) {
        return "kolibri_task_id:" + id;
    }

    private static String generateTagFromJobFunc(String jobFunc) {
        return "kolibri_job_type:" + jobFunc;
    }

    public static void enqueueOnce(String id, int delay, boolean expedite, String jobFunc, boolean longRunning) {
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
    }

    public static void clear(String id) {
        Context context = ContextUtil.getApplicationContext();
        List<String> tags = new ArrayList<String>();
        String tag = generateTagFromId(id);
        tags.add(tag);
        RemoteWorkManager workManager = RemoteWorkManager.getInstance(context);
        WorkQuery workQuery = WorkQuery.Builder
                .fromTags(tags)
                .build();
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
                        workManager.cancelAllWorkByTag(tag);
                    }
                }
            } catch (ExecutionException | InterruptedException e) {
                e.printStackTrace();
            }
        }, new MainThreadExecutor());
    }
}
