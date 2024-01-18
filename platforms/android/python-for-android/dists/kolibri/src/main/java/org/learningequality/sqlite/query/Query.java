package org.learningequality.sqlite.query;

import org.learningequality.sqlite.Database;

/**
 * A SQL query interface that defines a method to execute the query
 */
public interface Query<T> {
    T execute(Database db);
}
