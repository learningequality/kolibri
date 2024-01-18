package org.learningequality;

import android.content.Context;

import org.kivy.android.PythonActivity;
import org.learningequality.Kolibri.WorkerService;

public class ContextUtil {
    public static Context getApplicationContext() {
        if (isServiceContext()) {
            return WorkerService.mService.getApplicationContext();
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
        return WorkerService.mService != null;
    }
}
