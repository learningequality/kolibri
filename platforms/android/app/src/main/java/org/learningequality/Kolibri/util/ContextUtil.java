package org.learningequality;

import android.content.Context;

import org.kivy.android.PythonActivity;
import org.kivy.android.PythonProvider;

public class ContextUtil {
    public static Context getApplicationContext() {
        if (PythonProvider.isActive()) {
            return PythonProvider.get().getContext();
        }
        if (isActivityContext()) {
            return PythonActivity.mActivity.getApplicationContext();
        }
        return null;
    }

    public static boolean isActivityContext() {
        return PythonActivity.mActivity != null;
    }
}
