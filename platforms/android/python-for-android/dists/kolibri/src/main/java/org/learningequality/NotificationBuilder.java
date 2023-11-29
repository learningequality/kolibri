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
    }

    public NotificationBuilder(Context context) {
        this(context, NotificationRef.REF_CHANNEL_DEFAULT);
    }

    public NotificationBuilder(Context context, NotificationRef ref) {
        this(context, ref.getChannelId(context));
    }
}
