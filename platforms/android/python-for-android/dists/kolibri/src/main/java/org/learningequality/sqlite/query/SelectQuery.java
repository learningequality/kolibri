package org.learningequality.sqlite.query;

import android.database.Cursor;
import android.os.Bundle;

import org.learningequality.sqlite.Database;
import org.learningequality.sqlite.schema.DatabaseTable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A query that SELECTs rows from a table
 */
public class SelectQuery extends FilterableQuery<SelectQuery> implements Query<Bundle[]> {
    private String tableName;
    private final DatabaseTable.Column<?>[] selectColumns;
    private String orderBy;

    public SelectQuery(DatabaseTable.Column<?>... columns) {
        this.selectColumns = columns.length > 0 ? columns : null;
    }

    /**
     * Method to return the current instance of the query
     * @return the current instance of the query
     */
    @Override
    protected SelectQuery self() {
        return this;
    }

    public SelectQuery from(String tableName) {
        this.tableName = tableName;
        return this;
    }

    public SelectQuery orderBy(DatabaseTable.Column<?> column, boolean ascending) {
        this.orderBy = column.getColumnName() + (ascending ? " ASC" : " DESC");
        return this;
    }

    protected Bundle buildBundle(Database db, Cursor cursor) {
        Bundle b = new Bundle(cursor.getColumnCount() + 2);
        b.putString(DatabaseTable.DATABASE_NAME, db.getName());
        b.putString(DatabaseTable.TABLE_NAME, this.tableName);

        for (int i = 0; i < cursor.getColumnCount(); i++) {
            String columnName = cursor.getColumnName(i);
            switch (cursor.getType(i)) {
                case Cursor.FIELD_TYPE_NULL:
                    b.putString(columnName, null);
                    break;
                case Cursor.FIELD_TYPE_INTEGER:
                    b.putLong(columnName, cursor.getLong(i));
                    break;
                case Cursor.FIELD_TYPE_FLOAT:
                    b.putDouble(columnName, cursor.getDouble(i));
                    break;
                case Cursor.FIELD_TYPE_STRING:
                    b.putString(columnName, cursor.getString(i));
                    break;
                case Cursor.FIELD_TYPE_BLOB:
                    b.putByteArray(columnName, cursor.getBlob(i));
                    break;
            }
        }
        return b;
    }

    protected String[] generateSelectColumns() {
        if (this.selectColumns == null) {
            return null;
        }

        // This can be simpler with Java 8 streams
        List<String> selectColumns = new ArrayList<String>();
        for (DatabaseTable.Column<?> column : this.selectColumns) {
            selectColumns.add(column.getColumnName());
        }

        return selectColumns.toArray(new String[0]);
    }

    public Bundle[] execute(Database db) {
        if (!db.isConnected()) {
            return null;
        }

        try {
            List<Bundle> results;
            try (Cursor cursor = db.get().query(
                    this.tableName,
                    this.generateSelectColumns(),
                    buildSelection(),
                    buildSelectionArgs(),
                    null,
                    null,
                    this.orderBy
            )) {
                results = new ArrayList<Bundle>();
                while (cursor.moveToNext()) {
                    results.add(buildBundle(db, cursor));
                }
            }
            return results.toArray(new Bundle[0]);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}
