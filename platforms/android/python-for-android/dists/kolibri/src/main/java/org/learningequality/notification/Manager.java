package org.learningequality.notification;

import android.content.Context;

import androidx.core.app.NotificationManagerCompat;

public class Manager {
    private final Context context;
    private final NotificationRef ref;

    public Manager(Context context, NotificationRef ref) {
        this.context = context;
        this.ref = ref;
    }

    public void send() {
        send(null, null, -1, -1);
    }

    public void send(String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        if (ref == null) {
            return;
        }
        Builder builder = new Builder(context, ref);
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

    public void hide() {
        if (ref == null) {
            return;
        }
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(ref.getTag(), ref.getId());
    }
}
