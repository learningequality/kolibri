package org.kivy.android;

import android.content.Context;

public class PythonContext {
    public static PythonContext mInstance;

    private final Context context;

    private PythonContext(Context context) {
        this.context = context;
    }

    public static PythonContext getInstance(Context context) {
        if (mInstance == null) {
            synchronized (PythonContext.class) {
                if (mInstance == null) {
                    mInstance = new PythonContext(
                            context.getApplicationContext()
                    );
                }
            }
        }
        return PythonContext.mInstance;
    }

    public static Context get() {
        if (PythonContext.mInstance == null) {
            return null;
        }
        return PythonContext.mInstance.context;
    }
}
