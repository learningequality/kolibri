package org.learningequality.notification;

import android.Manifest;
import android.app.Notification;
import android.content.Context;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
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

    public Notification prepare(String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        if (ref == null) {
            return null;
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
        return builder.build();
    }

    public Notification send(String notificationTitle, String notificationText, int notificationProgress, int notificationTotal) {
        if (ref == null) {
            return null;
        }
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            // TODO: handle this case
            return null;
        }
        Notification notification = prepare(notificationTitle, notificationText, notificationProgress, notificationTotal);
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.notify(ref.getTag(), ref.getId(), notification);
        return notification;
    }

    public void hide() {
        if (ref == null) {
            return;
        }
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(ref.getTag(), ref.getId());
    }
}
