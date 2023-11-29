package org.learningequality;

import android.content.Context;

import org.kivy.android.PythonActivity;
import org.kivy.android.PythonService;
import org.kivy.android.PythonWorker;
import org.learningequality.NotificationRef;

public class ContextUtil {
    public static Context getApplicationContext() {
        if (isActivityContext()) {
            return PythonActivity.mActivity.getApplicationContext();
        }
        if (isServiceContext()) {
            return PythonService.mService.getApplicationContext();
        }
        if (isWorkerContext()) {
            return PythonWorker.mWorker.getApplicationContext();
        }
        return null;
    }

    public static boolean isActivityContext() {
        return PythonActivity.mActivity != null;
    }

    public static boolean isServiceContext() {
        return PythonService.mService != null;
    }

    public static boolean isWorkerContext() {
        return PythonWorker.mWorker != null;
    }
}
