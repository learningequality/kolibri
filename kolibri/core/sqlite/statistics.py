import sqlite3


def refresh_planner_statistics(cursor):
    # Before 3.46.0, PRAGMA optimize never analyzes tables that lack sqlite_stat1 entries:
    # https://www.sqlite.org/releaselog/3_46_0.html
    if sqlite3.sqlite_version_info >= (3, 46, 0):
        # Without 0x10000 only tables the planner used on this connection are checked,
        # and 0x10 keeps the default temporary analysis_limit that a bare 0x10002 drops:
        # https://www.sqlite.org/pragma.html#pragma_optimize
        cursor.execute("PRAGMA optimize=0x10012;")
        return
    if sqlite3.sqlite_version_info >= (3, 32, 0):
        # 1000 rows per index, as https://www.sqlite.org/pragma.html#pragma_analysis_limit suggests.
        cursor.execute("PRAGMA analysis_limit=1000;")
    cursor.execute("ANALYZE;")
