package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.work.Configuration;
import androidx.work.multiprocess.RemoteWorkerService;
import androidx.work.WorkManager;

import java.io.File;
import java.lang.System;

import org.kivy.android.PythonUtil;
import org.kivy.android.PythonWorker;

public class TaskworkerWorkerService extends RemoteWorkerService {
    private static final String TAG = "TaskworkerWorkerService";

    @Override
    public void onCreate() {
        Context context = getApplicationContext();
        try {
            Log.v(TAG, "Initializing WorkManager");
            Configuration configuration = new Configuration.Builder()
                .setDefaultProcessName(context.getPackageName())
                .build();
            WorkManager.initialize(context, configuration);
        } catch (IllegalStateException e) {
        }
        super.onCreate();
        PythonUtil.loadLibraries(
                new File(context.getApplicationInfo().nativeLibraryDir)
        );
    }
    @Override
    public void onDestroy() {
        super.onDestroy();
        // When the service exits, call System.exit to teardown the process.
        System.exit(0);
    }
}
