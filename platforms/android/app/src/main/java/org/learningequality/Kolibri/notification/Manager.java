package org.learningequality.Kolibri.notification;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.ForegroundInfo;
import org.learningequality.Kolibri.R;

public class Manager {
  private final Context context;
  private final NotificationRef ref;

  public Manager(Context context, NotificationRef ref) {
    this.context = context;
    this.ref = ref;
  }

  public Notification prepare(
      String notificationTitle,
      String notificationText,
      int notificationProgress,
      int notificationTotal) {
    return prepare(
        notificationTitle, notificationText, notificationProgress, notificationTotal, null);
  }

  public Notification prepare(
      String notificationTitle,
      String notificationText,
      int notificationProgress,
      int notificationTotal,
      PendingIntent contentIntent) {
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
    if (contentIntent != null) {
      builder.setContentIntent(contentIntent);
      builder.setAutoCancel(true);
    }
    return builder.build();
  }

  public Notification send(
      String notificationTitle,
      String notificationText,
      int notificationProgress,
      int notificationTotal) {
    return send(notificationTitle, notificationText, notificationProgress, notificationTotal, null);
  }

  public Notification send(
      String notificationTitle,
      String notificationText,
      int notificationProgress,
      int notificationTotal,
      PendingIntent contentIntent) {
    if (ref == null) {
      Log.w("Notification.Manager", "NotificationRef is null, cannot send notification");
      return null;
    }
    if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED) {
      Log.w(
          "Notification.Manager",
          "POST_NOTIFICATIONS permission not granted, skipping notification");
      return null;
    }
    Log.d("Notification.Manager", "Sending notification: " + notificationTitle);
    Notification notification =
        prepare(
            notificationTitle,
            notificationText,
            notificationProgress,
            notificationTotal,
            contentIntent);
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

  /**
   * Create ForegroundInfo for WorkManager foreground service
   *
   * @param context Application context
   * @param jobId Job identifier for notification
   * @param foregroundServiceType Service type flags for API 29+
   * @return ForegroundInfo for the foreground worker
   */
  public static ForegroundInfo createForegroundInfo(
      Context context, String jobId, int foregroundServiceType) {
    // Create NotificationRef using job ID
    NotificationRef ref =
        new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, jobId != null ? jobId : "task");

    // Create notification
    Builder builder = new Builder(context, ref);
    builder.setContentTitle(context.getString(R.string.notification_task_title));
    builder.setContentText(context.getString(R.string.notification_task_text));
    builder.setOngoing(true);

    Notification notification = builder.build();

    // Return ForegroundInfo with or without service type
    if (foregroundServiceType != 0) {
      return new ForegroundInfo(ref.getId(), notification, foregroundServiceType);
    } else {
      return new ForegroundInfo(ref.getId(), notification);
    }
  }
}
