package org.learningequality.Kolibri;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.work.Configuration;

public class App extends Application implements Configuration.Provider {
    @Override
    public void onCreate() {
        super.onCreate();
    }

    @NonNull
    @Override
    public Configuration getWorkManagerConfiguration() {
        String processName = getApplicationContext().getPackageName();
        processName += getApplicationContext().getString(R.string.task_worker_process);

        return new Configuration.Builder()
                .setDefaultProcessName(processName)
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .build();
    }
}
