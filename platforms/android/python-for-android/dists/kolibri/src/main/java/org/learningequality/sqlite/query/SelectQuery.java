package org.learningequality.sqlite.query;

import android.database.Cursor;
import android.os.Bundle;

import org.learningequality.sqlite.Database;
import org.learningequality.sqlite.schema.DatabaseTable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class SelectQuery {
    private String tableName;
    private final DatabaseTable.Column<?>[] selectColumns;
    private final List<String> whereClauses;
    private final List<String> whereParameters;
    private String orderBy;

    public SelectQuery(DatabaseTable.Column<?>... columns) {
        this.selectColumns = columns.length > 0 ? columns : null;
        this.whereClauses = new ArrayList<String>();
        this.whereParameters = new ArrayList<String>();
    }

    public SelectQuery from(String tableName) {
        this.tableName = tableName;
        return this;
    }

    public SelectQuery where(String clause, String... parameters) {
        this.whereClauses.add(clause);
        this.whereParameters.addAll(Arrays.asList(parameters));
        return this;
    }

    public SelectQuery where(DatabaseTable.Column<?> column, String value) {
        return where(column.getColumnName() + " = ?", value);
    }

    public SelectQuery where(DatabaseTable.ColumnEnum<String> value) {
        return where(value.getColumn(), value.getValue());
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

        // Currently we only support ANDing all where clauses
        String selection = String.join(" AND ", this.whereClauses);
        String[] selectionArgs = this.whereParameters.toArray(new String[0]);

        try {
            List<Bundle> results;
            try (Cursor cursor = db.get().query(
                    this.tableName,
                    this.generateSelectColumns(),
                    selection,
                    selectionArgs,
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
