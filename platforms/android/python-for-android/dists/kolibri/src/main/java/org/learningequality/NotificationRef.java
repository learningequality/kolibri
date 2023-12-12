package org.learningequality;

import android.content.Context;

import org.learningequality.Kolibri.R;

public final class NotificationRef {
    public static final int ID_DEFAULT = 1;
    public static final int REF_CHANNEL_SERVICE = 1;
    public static final int REF_CHANNEL_DEFAULT = 2;
    public static String ID_CHANNEL_DEFAULT = null;
    public static String ID_CHANNEL_SERVICE = null;
    private static boolean initialized = false;
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

    public static void initialize(Context context) {
        if (initialized) {
            return;
        }
        ID_CHANNEL_DEFAULT = context.getString(R.string.notification_default_channel_id);
        ID_CHANNEL_SERVICE = context.getString(R.string.notification_service_channel_id);
        initialized = true;
    }

    public static String getChannelId(Context context, int channelRef) {
        initialize(context);
        switch (channelRef) {
            case REF_CHANNEL_SERVICE:
                return ID_CHANNEL_SERVICE;
            case REF_CHANNEL_DEFAULT:
                return ID_CHANNEL_DEFAULT;
            default:
                return null;
        }
    }
}
