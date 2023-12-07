package org.learningequality.sqlite;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.util.Log;

import java.io.File;

public class Database implements AutoCloseable {
    public static final String TAG = "Kolibri.Database";

    private final String name;
    private final String path;
    private final int flags;
    private SQLiteDatabase db;

    private Database(String name, String path, int flags) {
        this.name = name;
        this.path = path;
        this.db = null;
        this.flags = flags;
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
            this.db = SQLiteDatabase.openDatabase(this.path, null, flags);
        } catch (SQLiteException e) {
            this.db = null;
        }
    }

    public void close() {
        if (isConnected()) {
            this.db.close();
            this.db = null;
        }
    }

    public static Database readonly(Context context, String name) {
        String path = null;
        File dir = context.getExternalFilesDir(null);
        if (dir != null) {
            File f = new File(new File(dir, "KOLIBRI_DATA"), name);
            if (f.exists()) {
                path = f.getPath();
            } else {
                Log.v(TAG, "Database file does not exist: " + f.getPath());
            }
        }

        return new Database(name, path, SQLiteDatabase.OPEN_READONLY);
    }
}
