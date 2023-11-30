package org.kivy.android;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import java.util.concurrent.Executors;

abstract public class PythonWorker extends RemoteListenableWorker {
    private static final String TAG = "PythonWorker";

    // WorkRequest data key for python worker argument
    public static final String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";

    public static final String TAG_LONG_RUNNING = "worker_long_running";

    public static final int MAX_WORKER_RETRIES = 3;

    // Python environment variables
    private String androidPrivate;
    private String androidArgument;
    private String pythonName;
    private String pythonHome;
    private String pythonPath;
    private String workerEntrypoint;

    public static PythonWorker mWorker = null;

    public PythonWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);

        String appRoot = PythonUtil.getAppRoot(context);

        PythonWorker.mWorker = this;

        androidPrivate = appRoot;
        androidArgument = appRoot;
        pythonHome = appRoot;
        pythonPath = appRoot + ":" + appRoot + "/lib";
    }

    public void setPythonName(String value) {
        pythonName = value;
    }

    public void setWorkerEntrypoint(String value) {
        workerEntrypoint = value;
    }

    public boolean isLongRunning() {
        return getTags().contains(TAG_LONG_RUNNING);
    }

    @NonNull
    @Override
    public ListenableFuture<Result> startRemoteWork() {
        return CallbackToFutureAdapter.getFuture(completer -> {
            String id = getId().toString();
            String dataArg = getInputData().getString(ARGUMENT_WORKER_ARGUMENT);

            final String serviceArg;
            if (dataArg != null) {
                Log.d(TAG, id + " Setting python worker argument to " + dataArg);
                serviceArg = dataArg;
            } else {
                serviceArg = "";
            }

            if (isLongRunning()) {
                Log.d(TAG, id + " Enabling foreground service for long running task");
                setForegroundAsync(getForegroundInfo());
            }

            // The python thread handling the work needs to be run in a
            // separate thread so that future can be returned. Without
            // it, any cancellation can't be processed.
            final Thread pythonThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    Log.d(TAG, id + " Running with python worker argument: " + serviceArg);

                    try {
                        int res = nativeStart(
                                androidPrivate, androidArgument,
                                workerEntrypoint, pythonName,
                                pythonHome, pythonPath,
                                serviceArg
                        );
                        Log.d(TAG, id + " Finished remote python work: " + res);

                        if (res == 0) {
                            completer.set(Result.success());
                        } else {
                            completer.set(Result.failure());
                        }
                    }  catch (Exception e) {
                        if (getRunAttemptCount() > MAX_WORKER_RETRIES) {
                            Log.e(TAG, id + " Exception in remote python work", e);
                            completer.setException(e);
                        } else {
                            Log.w(TAG, id + " Exception in remote python work, scheduling retry", e);
                            completer.set(Result.retry());
                        }
                    } finally {
                        cleanup();
                    }
                }
            }, "python_worker_thread");

            completer.addCancellationListener(new Runnable() {
                @Override
                public void run() {
                    Log.i(TAG, id + " Interrupting remote work");
                    pythonThread.interrupt();
                }
            }, Executors.newSingleThreadExecutor());

            Log.i(TAG, id + " Starting remote python work");
            pythonThread.start();

            return TAG + " work thread";
        });
    }

    // Native part
    public static native int nativeStart(
        String androidPrivate, String androidArgument,
        String workerEntrypoint, String pythonName,
        String pythonHome, String pythonPath,
        String pythonServiceArgument
    );

    public void onStopped() {
        cleanup();
        super.onStopped();
        mWorker = null;
    }
    protected void cleanup() {}

    abstract public ForegroundInfo getForegroundInfo();

    @Override
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture((CallbackToFutureAdapter.Resolver<ForegroundInfo>) completer -> completer.set(getForegroundInfo()));
    }

    public static native int tearDownPython();
}
