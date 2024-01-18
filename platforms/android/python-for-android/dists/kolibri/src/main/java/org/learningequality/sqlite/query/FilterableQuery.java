package org.learningequality.sqlite.query;

import org.learningequality.sqlite.schema.DatabaseTable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A base query that can be filtered
 */
public abstract class FilterableQuery<T extends FilterableQuery<T>> {
    private final List<String> whereClauses;
    private final List<String> whereParameters;

    public FilterableQuery() {
        this.whereClauses = new ArrayList<String>();
        this.whereParameters = new ArrayList<String>();
    }

    public T where(String clause, String... parameters) {
        this.whereClauses.add(clause);
        this.whereParameters.addAll(Arrays.asList(parameters));
        return self();
    }

    public T where(DatabaseTable.Column<?> column, String value) {
        return where(column.getColumnName() + " = ?", value);
    }

    public T where(DatabaseTable.ColumnEnum<String> value) {
        return where(value.getColumn(), value.getValue());
    }

    protected String buildSelection() {
        // Currently we only support ANDing all where clauses
        return String.join(" AND ", this.whereClauses);
    }

    protected String[] buildSelectionArgs() {
        return this.whereParameters.toArray(new String[this.whereParameters.size()]);
    }

    /**
     * Method to return the current instance of the query
     * @return the current instance of the query
     */
    protected abstract T self();
}
