package org.learningequality.Kolibri;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Configuration;

import org.learningequality.notification.NotificationRef;

import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;


public class App extends Application implements Configuration.Provider {
    protected final AtomicInteger activeActivities = new AtomicInteger(0);

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        // Register activity lifecycle callbacks
        registerActivityLifecycleCallbacks(new KolibriActivityLifecycleCallbacks());
        WorkController.getInstance(this).wake();
    }

    @NonNull
    @Override
    public Configuration getWorkManagerConfiguration() {
        String processName = getApplicationContext().getPackageName();
        processName += getApplicationContext().getString(R.string.task_worker_process);

        // Using the same quantity of worker threads as Kolibri's python side:
        // https://github.com/learningequality/kolibri/blob/release-v0.16.x/kolibri/utils/options.py#L683
        return new Configuration.Builder()
                .setDefaultProcessName(processName)
                .setMinimumLoggingLevel(android.util.Log.DEBUG)
                .setExecutor(Executors.newFixedThreadPool(6))
                .build();
    }

    private void createNotificationChannels() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is not in the Support Library.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getApplicationContext();
            NotificationChannelCompat serviceChannel = new NotificationChannelCompat.Builder(
                    NotificationRef.ID_CHANNEL_SERVICE,
                    NotificationManagerCompat.IMPORTANCE_MIN
            )
                    .setName(context.getString(R.string.notification_service_channel_title))
                    .setShowBadge(false)
                    .build();
            NotificationChannelCompat taskChannel = new NotificationChannelCompat.Builder(
                    NotificationRef.ID_CHANNEL_DEFAULT,
                    NotificationManagerCompat.IMPORTANCE_DEFAULT
            )
                    .setName(context.getString(R.string.notification_default_channel_title))
                    .build();

            // Register the channel with the system. You can't change the importance
            // or other notification behaviors after this.
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.createNotificationChannel(serviceChannel);
            notificationManager.createNotificationChannel(taskChannel);
        }
    }

    protected int incrementActiveActivities() {
        synchronized (activeActivities) {
            return activeActivities.incrementAndGet();
        }
    }

    protected int decrementActiveActivities() {
        synchronized (activeActivities) {
            // Prevent decrementing below 0
            if (activeActivities.get() == 0) {
                return 0;
            }
            return activeActivities.decrementAndGet();
        }
    }

    public class KolibriActivityLifecycleCallbacks implements ActivityLifecycleCallbacks {
        @Override
        public void onActivityCreated(@NonNull Activity activity, Bundle savedInstanceState) { /* no-op */ }

        @Override
        public void onActivityStarted(@NonNull Activity activity) {
            incrementActiveActivities();
            WorkController.getInstance(getApplicationContext()).wake();
        }

        @Override
        public void onActivityResumed(@NonNull Activity activity) {
            incrementActiveActivities();
            WorkController.getInstance(getApplicationContext()).wake();
        }

        @Override
        public void onActivityPaused(@NonNull Activity activity) {
            if (decrementActiveActivities() == 0) {
                WorkController.getInstance(getApplicationContext()).sleep();
            }
        }

        @Override
        public void onActivityStopped(@NonNull Activity activity) { /* no-op */ }

        @Override
        public void onActivityPostStopped(@NonNull Activity activity) {
            // using postStopped in case another activity is started
            if (decrementActiveActivities() == 0) {
                WorkController.getInstance(getApplicationContext()).sleep();
            }
        }

        @Override
        public void onActivitySaveInstanceState(
                @NonNull Activity activity, @NonNull Bundle outState
        ) { /* no-op */ }

        @Override
        public void onActivityDestroyed(@NonNull Activity activity) { /* no-op */ }
    }
}
