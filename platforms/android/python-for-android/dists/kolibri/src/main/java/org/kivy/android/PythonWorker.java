package org.kivy.android;

import android.content.Context;
import android.os.Process;
import android.util.Log;

import androidx.annotation.NonNull;

import org.learningequality.Kolibri.sqlite.JobStorage;
import org.learningequality.sqlite.query.UpdateQuery;

/**
 * Ideally this would be called `PythonWorkerImpl` but the name is used in the native code.
 */
public class PythonWorker {
    private static final String TAG = "PythonWorkerImpl";
    // Python environment variables
    private final String pythonName;
    private final String workerEntrypoint;
    private final String androidPrivate;
    private final String androidArgument;
    private final String pythonHome;
    private final String pythonPath;


    public PythonWorker(@NonNull Context context, String pythonName, String workerEntrypoint) {
        PythonLoader.doLoad(context);
        this.pythonName = pythonName;
        this.workerEntrypoint = workerEntrypoint;
        String appRoot = PythonUtil.getAppRoot(context);
        androidPrivate = appRoot;
        androidArgument = appRoot;
        pythonHome = appRoot;
        pythonPath = appRoot + ":" + appRoot + "/lib";
    }

    // Native part
    public static native int nativeStart(
            String androidPrivate, String androidArgument,
            String workerEntrypoint, String pythonName,
            String pythonHome, String pythonPath,
            String pythonServiceArgument
    );

    public static native int tearDownPython();

    public boolean execute(String id, String arg) {
        Log.d(TAG, id + " Running with python worker argument: " + arg);

        String serializedArg = String.join(
                ",",
                id,
                arg,
                Integer.toString(Process.myPid()),
                Long.toString(Thread.currentThread().getId())
        );

        int res;
        try {
            res = nativeStart(
                    androidPrivate, androidArgument,
                    workerEntrypoint, pythonName,
                    pythonHome, pythonPath,
                    serializedArg
            );
            Log.d(TAG, id + " Finished executing python work: " + res);
            if (res == 0) {
                // If the result is 0, execution was successful
                return true;
            } else {
                // For any result other than 0, log and treat as a failure
                Log.e(TAG, "Python work execution failed with result code: " + res);
                return false;
            }
        } catch (Exception e) {
            // Catch and log any exceptions, treating them as execution failures
            Log.e(TAG, "Error executing python work", e);
            return false;
        }
    }
}
