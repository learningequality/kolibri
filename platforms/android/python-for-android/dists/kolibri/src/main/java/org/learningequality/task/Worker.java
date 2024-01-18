package org.learningequality.task;

import androidx.work.Data;

import org.learningequality.notification.Notifier;
import org.learningequality.notification.NotificationRef;

import java.util.UUID;

public interface Worker extends Notifier {
    String TAG = "Kolibri.TaskWorker";
    String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";

    UUID getId();

    Data getInputData();

    default String getArgument() {
        String dataArg = getInputData().getString(ARGUMENT_WORKER_ARGUMENT);
        final String serviceArg;
        if (dataArg != null) {
            serviceArg = dataArg;
        } else {
            serviceArg = "";
        }
        return serviceArg;
    }

    default NotificationRef getNotificationRef() {
        // Use worker request ID as notification tag
        return buildNotificationRef(getId());
    }

    static NotificationRef buildNotificationRef(UUID id) {
        return buildNotificationRef(id.toString());
    }

    static NotificationRef buildNotificationRef(String id) {
        return new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, id);
    }
}
