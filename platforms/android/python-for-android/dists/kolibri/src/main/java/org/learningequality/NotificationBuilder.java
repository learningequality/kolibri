package org.learningequality;

import android.content.Context;

import androidx.core.app.NotificationCompat;

import org.learningequality.Kolibri.R;

public class NotificationBuilder extends NotificationCompat.Builder {
    public NotificationBuilder(Context context, String channelId) {
        super(context, channelId);
        setSmallIcon(R.drawable.ic_stat_kolibri_notification);
        setPriority(NotificationCompat.PRIORITY_LOW);
        setColor(context.getColor(R.color.primary));
        setSilent(true);

        // Default title
        String notificationTitle = context.getApplicationContext().getString(R.string.app_name);
        setContentTitle(notificationTitle);
    }

    public NotificationBuilder(Context context, int channelRef) {
        this(context, NotificationRef.getChannelId(context, channelRef));

        // defaults for service notification channel
        if (channelRef == NotificationRef.REF_CHANNEL_SERVICE) {
            setOngoing(true);
            setCategory(NotificationCompat.CATEGORY_SERVICE);
            setContentTitle(context.getString(R.string.notification_service_channel_content));
        } else if (channelRef == NotificationRef.REF_CHANNEL_DEFAULT) {
            setCategory(NotificationCompat.CATEGORY_PROGRESS);
        }
    }

    public NotificationBuilder(Context context, NotificationRef ref) {
        this(context, ref.getChannelRef());
    }

    public NotificationBuilder(Context context) {
        this(context, NotificationRef.REF_CHANNEL_DEFAULT);
    }
}
