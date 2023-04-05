package org.learningequality;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.Executor;

// Ref: https://github.com/square/retrofit/blob/master/retrofit/src/main/java/retrofit2/Platform.java#L351

public class MainThreadExecutor implements Executor {
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void execute(Runnable r) {
        handler.post(r);
    }
}
