package org.learningequality.sqlite.query;

import org.learningequality.sqlite.Database;
import org.learningequality.sqlite.schema.DatabaseTable;

import android.content.ContentValues;

/**
 * A class that represents an UPDATE SQL query
 */
public class UpdateQuery extends FilterableQuery<UpdateQuery> implements Query<Integer> {
    private final String tableName;
    private ContentValues values;

    public UpdateQuery(String tableName) {
        this.tableName = tableName;
        this.values = new ContentValues();
    }

    /**
     * Method to return the current instance of the query
     * @return the current instance of the query
     */
    @Override
    protected UpdateQuery self() {
        return this;
    }

    public UpdateQuery set(ContentValues values) {
        this.values = values;
        return this;
    }

    public UpdateQuery set(DatabaseTable.Column<?> column, String value) {
        this.values.put(column.getColumnName(), value);
        return this;
    }

    public Integer execute(Database db) {
        if (!db.isConnected()) {
            return 0;
        }

        if (this.values.size() == 0) {
            throw new IllegalStateException("No values to update");
        }

        return db.get().update(this.tableName, this.values, buildSelection(), buildSelectionArgs());
    }
}
