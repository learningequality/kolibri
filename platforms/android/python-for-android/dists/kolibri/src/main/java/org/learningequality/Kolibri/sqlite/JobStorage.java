package org.learningequality.Kolibri.sqlite;

import org.learningequality.sqlite.schema.DatabaseTable;

public class JobStorage {
    public static final String DATABASE_NAME = "job_storage.sqlite3";

    public static class Jobs implements DatabaseTable {
        public static final String TABLE_NAME = "jobs";

        public String getTableName() {
            return TABLE_NAME;
        }

        public static final StringColumn id = new StringColumn("id");
        public static final StringColumn worker_process = new StringColumn("worker_process");
        public static final StringColumn worker_thread = new StringColumn("worker_thread");
        public static final StringColumn worker_extra = new StringColumn("worker_extra");
        public static final StringColumn time_updated = new StringColumn("time_updated");
        public static final StringColumn state = new StringColumn("state");

        public enum State implements ColumnEnum<String> {
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
    }
}
