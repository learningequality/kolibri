package org.kivy.android;

import android.content.Context;

/**
 * This class is used to provide the Context to the python-side in a way that minimizes us
 * potentially creating memory leaks by holding a static reference to the context. It implements
 * AutoCloseable so that it can be used in a try-with-resources block and automatically release
 * the static instance and the instance's context.
 */
public class PythonProvider implements AutoCloseable {
    private static final ThreadLocal<PythonProvider> localInstance = new ThreadLocal<>();
    private final Context context;

    public PythonProvider(Context context) {
        this.context = context;
        localInstance.set(this);
    }

    public Context getContext() {
        return context;
    }


    public void close() {
        localInstance.remove();
    }

    public static PythonProvider create(Context context) {
        if (isActive()) {
            throw new RuntimeException("PythonProviders cannot be nested");
        }
        return new PythonProvider(context);
    }

    public static PythonProvider get() {
        if (!isActive()) {
            throw new RuntimeException("PythonProvider not initialized");
        }
        return PythonProvider.localInstance.get();
    }

    public static boolean isActive() {
        return localInstance.get() != null;
    }
}
