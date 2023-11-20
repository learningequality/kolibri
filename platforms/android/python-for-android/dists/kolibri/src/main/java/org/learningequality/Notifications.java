package org.learningequality;

import android.app.Notification;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.learningequality.Kolibri.R;

public class Notifications {
    public static Notification createNotification(String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        Context context = ContextUtil.getApplicationContext();
        String channelId = context.getString(R.string.notification_channel_id);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_kolibri_notification)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setColor(context.getColor(R.color.primary))
                .setSilent(true)
                .setContentTitle(notificationTitle);
        if (notificationText != null) {
            builder.setContentText(notificationText);
        }
        if (notificationProgress != -1 && notificationTotal != -1) {
            builder.setProgress(notificationTotal, notificationProgress, false);
        }
        return builder.build();
    }

    public static void showNotification(int notificationId, String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        Context context = ContextUtil.getApplicationContext();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.notify(notificationId, createNotification(notificationTitle, notificationText, notificationProgress, notificationTotal));
    }

    public static void hideNotification(int notificationId) {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Context context = ContextUtil.getApplicationContext();
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancel(notificationId);
        }, 5000); // Delay in milliseconds (5 seconds)
    }
}
