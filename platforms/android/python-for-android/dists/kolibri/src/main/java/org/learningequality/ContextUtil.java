package org.learningequality;

import android.content.Context;

import org.kivy.android.PythonActivity;
import org.learningequality.Kolibri.TaskworkerWorker;
import org.learningequality.Kolibri.TaskworkerWorkerService;

public class ContextUtil {
    public static Context getApplicationContext() {
        if (isWorkerContext()) {
            return TaskworkerWorker.mWorker.getApplicationContext();
        }
        if (isServiceContext()) {
            return TaskworkerWorkerService.mService.getApplicationContext();
        }
        if (isActivityContext()) {
            return PythonActivity.mActivity.getApplicationContext();
        }
        return null;
    }

    public static boolean isActivityContext() {
        return PythonActivity.mActivity != null;
    }

    public static boolean isServiceContext() {
        return TaskworkerWorkerService.mService != null;
    }

    public static boolean isWorkerContext() {
        return TaskworkerWorker.mWorker != null;
    }
}
