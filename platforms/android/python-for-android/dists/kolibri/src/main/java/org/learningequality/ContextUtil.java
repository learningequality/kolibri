package org.learningequality;

import android.content.Context;

import org.kivy.android.PythonActivity;
import org.kivy.android.PythonService;
import org.kivy.android.PythonWorker;

public class ContextUtil {
    public static Context getApplicationContext() {
        if (PythonActivity.mActivity != null) {
            return PythonActivity.mActivity.getApplicationContext();
        }
        if (PythonService.mService != null) {
            return PythonService.mService.getApplicationContext();
        }
        if (PythonWorker.mWorker != null) {
            return PythonWorker.mWorker.getApplicationContext();
        }
        return null;
    }
}
