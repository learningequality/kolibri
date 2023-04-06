package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.work.Configuration;
import androidx.work.multiprocess.RemoteWorkerService;
import androidx.work.WorkManager;

import java.lang.System;

public class TaskworkerWorkerService extends RemoteWorkerService {
    private static final String TAG = "TaskworkerWorkerService";

    @Override
    public void onCreate() {
        try {
            Log.v(TAG, "Initializing WorkManager");
            Context context = getApplicationContext();
            Configuration configuration = new Configuration.Builder()
                .setDefaultProcessName(context.getPackageName())
                .build();
            WorkManager.initialize(context, configuration);
        } catch (IllegalStateException e) {
        }
        super.onCreate();
    }
    @Override
    public void onDestroy() {
        super.onDestroy();
        // When the service exits, call System.exit to teardown the process.
        System.exit(0);
    }
}
