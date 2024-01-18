package org.learningequality.notification;

import android.content.Context;


public interface Notifier {
    Context getApplicationContext();

    default NotificationRef getNotificationRef() {
        return null;
    }

    default void sendNotification() {
        sendNotification(null, null, -1, -1);
    }

    default Manager getNotificationManager(NotificationRef ref) {
        return new Manager(getApplicationContext(), ref);
    }

    default void sendNotification(
            String notificationTitle,
            String notificationText,
            int notificationProgress,
            int notificationTotal
    ) {
        getNotificationManager(getNotificationRef())
                .send(notificationTitle, notificationText, notificationProgress, notificationTotal);
    }

    default void hideNotification() {
        getNotificationManager(getNotificationRef()).hide();
    }
}
