package org.learningequality.Kolibri;

import android.app.Application;
import android.content.Context;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.NotificationChannelCompat;
import androidx.work.Configuration;

public class App extends Application implements Configuration.Provider {
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
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

    private void createNotificationChannels() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is not in the Support Library.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getApplicationContext();
            NotificationChannelCompat serviceChannel = new NotificationChannelCompat.Builder(
                    context.getString(R.string.notification_service_channel_id),
                    NotificationManagerCompat.IMPORTANCE_MIN
            )
                    .setName(context.getString(R.string.notification_service_channel_title))
                    .setShowBadge(false)
                    .build();
            NotificationChannelCompat taskChannel = new NotificationChannelCompat.Builder(
                    context.getString(R.string.notification_default_channel_id),
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
}
