import sqlite3


def refresh_planner_statistics(cursor):
    # Before 3.46.0, PRAGMA optimize never analyzes tables that lack sqlite_stat1 entries:
    # https://www.sqlite.org/releaselog/3_46_0.html
    if sqlite3.sqlite_version_info >= (3, 46, 0):
        cursor.execute("PRAGMA optimize;")
        return
    if sqlite3.sqlite_version_info >= (3, 32, 0):
        # 1000 rows per index, as https://www.sqlite.org/pragma.html#pragma_analysis_limit suggests.
        cursor.execute("PRAGMA analysis_limit=1000;")
    cursor.execute("ANALYZE;")
