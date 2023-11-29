package org.learningequality;

import android.content.Context;

import androidx.core.app.NotificationManagerCompat;

public interface Notifier {
    Context getApplicationContext();

    default NotificationRef getNotificationRef() {
        return null;
    }

    default void sendNotification() {
        sendNotification(null, null, -1, -1);
    }

    default void sendNotification(String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        NotificationRef ref = getNotificationRef();
        if (ref == null) {
            return;
        }
        Context context = getApplicationContext();
        NotificationBuilder builder = new NotificationBuilder(context, ref);
        if (notificationTitle != null) {
            builder.setContentTitle(notificationTitle);
        }
        if (notificationText != null) {
            builder.setContentText(notificationText);
        }
        if (notificationProgress != -1 && notificationTotal != -1) {
            builder.setProgress(notificationTotal, notificationProgress, false);
        }
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.notify(ref.getTag(), ref.getId(), builder.build());
    }

    default void hideNotification() {
        NotificationRef ref = getNotificationRef();
        if (ref == null) {
            return;
        }
        Context context = getApplicationContext();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(ref.getTag(), ref.getId());
    }
}
