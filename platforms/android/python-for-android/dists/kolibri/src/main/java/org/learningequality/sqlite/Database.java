package org.learningequality.sqlite;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.util.Log;

import java.io.File;

public class Database implements AutoCloseable {
    public static final String TAG = "KolibriDatabase";

    private final String name;
    private final String path;
    private final int flags;
    private boolean inTransaction;
    private SQLiteDatabase db;

    protected Database(String name, String path, int flags) {
        this.name = name;
        this.path = path;
        this.db = null;
        this.flags = flags;
        this.inTransaction = false;
        initialize();
    }

    public boolean isConnected() {
        return this.path != null && this.db != null;
    }

    public SQLiteDatabase get() {
        if (!isConnected()) {
            throw new IllegalStateException("Database is not connected");
        }
        return this.db;
    }

    public String getName() {
        return this.name;
    }

    protected void initialize() {
        if (this.path == null) {
            return;
        }
        try {
            Log.d(TAG, "Connecting to database");
            this.db = SQLiteDatabase.openDatabase(this.path, null, flags);
        } catch (SQLiteException e) {
            this.db = null;
        }
    }

    public void begin() {
        if (!isConnected()) {
            return;
        }
        Log.d(TAG, "Starting transaction");
        this.inTransaction = true;
        this.db.beginTransaction();
    }

    public void rollback() {
        if (!isConnected() || !this.inTransaction) {
            return;
        }
        Log.d(TAG, "Rolling back transaction");
        this.inTransaction = false;
        this.db.endTransaction();
    }

    public void commit() {
        if (!isConnected() || !this.inTransaction) {
            return;
        }
        Log.d(TAG, "Committing transaction");
        this.inTransaction = false;
        this.db.setTransactionSuccessful();
        this.db.endTransaction();
    }

    public void close() {
        if (isConnected()) {
            Log.d(TAG, "Closing database");
            rollback();
            this.db.close();
            this.db = null;
        }
    }

    protected static File getDatabasePath(Context context, String name) {
        File dir = context.getExternalFilesDir(null);
        if (dir != null) {
            File f = new File(new File(dir, "KOLIBRI_DATA"), name);
            if (f.exists()) {
                return f;
            } else {
                Log.v(TAG, "Database file does not exist: " + f.getPath());
            }
        }
        return null;
    }
}
