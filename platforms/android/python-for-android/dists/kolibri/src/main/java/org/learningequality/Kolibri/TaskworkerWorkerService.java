package org.learningequality.Kolibri;

import android.content.Context;
import android.util.Log;

import androidx.work.multiprocess.RemoteWorkerService;
import androidx.work.WorkManager;

import java.io.File;

import org.kivy.android.PythonUtil;
import org.learningequality.NotificationRef;
import org.learningequality.Notifier;

public class TaskworkerWorkerService extends RemoteWorkerService implements Notifier {
    private static final String TAG = "TaskworkerWorkerService";

    public static TaskworkerWorkerService mService = null;

    @Override
    public void onCreate() {
        Context context = getApplicationContext();
        Log.v(TAG, "Initializing WorkManager");
        WorkManager.getInstance(getApplicationContext());
        super.onCreate();
        PythonUtil.loadLibraries(
                new File(context.getApplicationInfo().nativeLibraryDir)
        );
        mService = this;
        sendNotification();
    }

    @Override
    public void onDestroy() {
        hideNotification();
        super.onDestroy();
        mService = null;
    }

    public NotificationRef getNotificationRef() {
        return new NotificationRef(NotificationRef.REF_CHANNEL_SERVICE);
    }
}
