package org.learningequality.notification;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import org.learningequality.Kolibri.R;

public class Builder extends NotificationCompat.Builder {
    public Builder(Context context, String channelId) {
        super(context, channelId);
        setSmallIcon(R.drawable.ic_stat_kolibri_notification);
        setPriority(NotificationCompat.PRIORITY_LOW);
        try {
            setColor(context.getColor(R.color.primary));
        } catch (NullPointerException e) {
            // This seems to happen on Android 7
            // when this method is invoked from Python.
        }
        setSilent(true);

        // Default title
        String notificationTitle = context.getApplicationContext().getString(R.string.app_name);
        setContentTitle(notificationTitle);

        // defaults for service notification channel
        if (channelId.equals(NotificationRef.ID_CHANNEL_SERVICE)) {
            setOngoing(true);
            setCategory(NotificationCompat.CATEGORY_SERVICE);
            setContentText(context.getString(R.string.notification_service_channel_content));
            setTicker(context.getString(R.string.notification_channel_ticker));

            // Add settings button to notification for quick access to the minimize setting for this
            // foreground notification channel
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                intent.putExtra(Settings.EXTRA_CHANNEL_ID, channelId);
                addAction(new NotificationCompat.Action.Builder(
                        R.drawable.baseline_notifications_paused_24,
                        context.getString(R.string.notification_service_channel_action),
                        PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
                ).build());
            }
        } else if (channelId.equals(NotificationRef.ID_CHANNEL_DEFAULT)) {
            setCategory(NotificationCompat.CATEGORY_PROGRESS);
            setTicker(context.getString(R.string.notification_channel_ticker));
        }
    }

    public Builder(Context context, int channelRef) {
        this(context, NotificationRef.getChannelId(channelRef));
    }

    public Builder(Context context, NotificationRef ref) {
        this(context, ref.getChannelRef());
    }

    public Builder(Context context) {
        this(context, NotificationRef.REF_CHANNEL_DEFAULT);
    }
}
