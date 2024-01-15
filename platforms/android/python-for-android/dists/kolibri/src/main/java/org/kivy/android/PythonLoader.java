package org.kivy.android;

import android.content.Context;

import java.io.File;
import java.util.concurrent.atomic.AtomicBoolean;

public class PythonLoader {
    protected static PythonLoader mInstance;

    private final File src;
    private final AtomicBoolean isLoaded = new AtomicBoolean(false);

    private PythonLoader(File src) {
        this.src = src;
    }

    public void load() {
        synchronized (isLoaded) {
            if (isLoaded.get()) {
                return;
            }
            PythonUtil.loadLibraries(src);
            isLoaded.set(true);
        }
    }

    public static PythonLoader getInstance(Context context) {
        if (mInstance == null) {
            synchronized (PythonLoader.class) {
                if (mInstance == null) {
                    mInstance = new PythonLoader(
                            new File(context.getApplicationInfo().nativeLibraryDir)
                    );
                }
            }
        }
        return PythonLoader.mInstance;
    }

    public static void doLoad(Context context) {
        PythonLoader.getInstance(context).load();
    }
}
