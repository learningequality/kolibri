package org.learningequality.notification;

import android.app.Notification;
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

    default Notification sendNotification(
            String notificationTitle,
            String notificationText,
            int notificationProgress,
            int notificationTotal
    ) {
        return getNotificationManager(getNotificationRef())
                .send(notificationTitle, notificationText, notificationProgress, notificationTotal);
    }

    default void hideNotification() {
        getNotificationManager(getNotificationRef()).hide();
    }
}
