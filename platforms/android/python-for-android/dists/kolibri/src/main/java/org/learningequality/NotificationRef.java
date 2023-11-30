package org.learningequality;

import android.content.Context;

import org.learningequality.Kolibri.R;

public final class NotificationRef {
    public static final int ID_DEFAULT = 1;
    public static final int REF_CHANNEL_SERVICE = 1;
    public static final int REF_CHANNEL_DEFAULT = 2;
    private final int channelRef;
    private final String tag;
    private final int id;

    public NotificationRef(int channelRef, int id, String tag) {
        this.channelRef = channelRef;
        this.id = id;
        this.tag = tag;
    }

    public NotificationRef(int channelRef, String tag) {
        this(channelRef, ID_DEFAULT, tag);
    }

    public NotificationRef(int channelRef) {
        this(channelRef, ID_DEFAULT, null);
    }

    public int getChannelRef() {
        return channelRef;
    }

    public int getId() {
        return id;
    }

    public String getTag() {
        return tag;
    }

    public static String getChannelId(Context context, int channelRef) {
        switch (channelRef) {
            case REF_CHANNEL_SERVICE:
                return context.getString(R.string.notification_service_channel_id);
            case REF_CHANNEL_DEFAULT:
                return context.getString(R.string.notification_default_channel_id);
            default:
                return null;
        }
    }
}