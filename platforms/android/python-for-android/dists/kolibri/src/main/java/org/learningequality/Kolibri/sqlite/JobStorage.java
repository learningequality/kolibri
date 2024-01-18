package org.learningequality.Kolibri.sqlite;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;

import org.learningequality.sqlite.schema.DatabaseTable;
import org.learningequality.sqlite.Database;

import java.io.File;

public class JobStorage extends Database {
    public static final String DATABASE_NAME = "job_storage.sqlite3";

    protected JobStorage(String path, int flags) {
        super(DATABASE_NAME, path, flags);
    }

    public static JobStorage readwrite(Context context) {
        File f = getDatabasePath(context, DATABASE_NAME);

        return f != null
                ? new JobStorage(f.getPath(), SQLiteDatabase.OPEN_READWRITE)
                : null;
    }

    public static class Jobs implements DatabaseTable {
        public static final String TABLE_NAME = "jobs";
        public static final StringColumn id = new StringColumn("id");
        public static final StringColumn func = new StringColumn("func");
        public static final LongColumn priority = new LongColumn("priority");
        public static final StringColumn worker_process = new StringColumn("worker_process");
        public static final StringColumn worker_thread = new StringColumn("worker_thread");
        public static final StringColumn worker_extra = new StringColumn("worker_extra");
        public static final StringColumn time_updated = new StringColumn("time_updated");
        public static final StringColumn state = new StringColumn("state");

        public String getTableName() {
            return TABLE_NAME;
        }

        public enum State implements StringChoiceEnum {
            PENDING,
            QUEUED,
            SCHEDULED,
            SELECTED,
            RUNNING,
            CANCELING,
            CANCELED,
            FAILED,
            COMPLETED;

            public StringColumn getColumn() {
                return state;
            }
        }

        public enum Priority implements ColumnEnum<Long> {
            LOW(15L),
            REGULAR(10L),
            HIGH(5L);

            private final Long value;

            Priority(Long val) {
                this.value = val;
            }

            public Long getValue() {
                return this.value;
            }

            public boolean isAtLeast(Long other) {
                return this.value.compareTo(other) >= 0;
            }

            public LongColumn getColumn() {
                return priority;
            }
        }
    }
}
