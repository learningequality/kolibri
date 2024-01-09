package org.learningequality.Kolibri.sqlite;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;

import org.learningequality.sqlite.schema.DatabaseTable;
import org.learningequality.sqlite.Database;

import java.io.File;

public class JobStorage extends Database {
    public static final String DATABASE_NAME = "job_storage.sqlite3";

    public static class Jobs implements DatabaseTable {
        public static final String TABLE_NAME = "jobs";

        public String getTableName() {
            return TABLE_NAME;
        }

        public static final StringColumn id = new StringColumn("id");
        public static final StringColumn func = new StringColumn("func");
        public static final IntegerColumn priority = new IntegerColumn("priority");
        public static final StringColumn worker_process = new StringColumn("worker_process");
        public static final StringColumn worker_thread = new StringColumn("worker_thread");
        public static final StringColumn worker_extra = new StringColumn("worker_extra");
        public static final StringColumn time_updated = new StringColumn("time_updated");
        public static final StringColumn state = new StringColumn("state");

        public enum State implements StringChoiceEnum {
            PENDING,
            QUEUED,
            SCHEDULED,
            SELECTED,
            RUNNING,
            CANCELING,
            CANCELED,
            FAILED,
            COMPLETED
            ;

            public StringColumn getColumn() {
                return state;
            }
        }

        public enum Priority implements ColumnEnum<Integer> {
            LOW(15),
            REGULAR(10),
            HIGH(5)
            ;

            private final int value;

            Priority(int val) {
                this.value = val;
            }

            public Integer getValue() {
                return this.value;
            }

            public IntegerColumn getColumn() {
                return priority;
            }


        }
    }

    protected JobStorage(String path, int flags) {
        super(DATABASE_NAME, path, flags);
    }

    public static JobStorage readwrite(Context context) {
        File f = getDatabasePath(context, DATABASE_NAME);

        return f != null
            ? new JobStorage(f.getPath(), SQLiteDatabase.OPEN_READWRITE)
            : null;
    }
}
