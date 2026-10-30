import sqlite3

from kolibri.core.sqlite.pragmas import OPTIMIZE_PRAGMA


def refresh_planner_statistics(cursor, allow_full_scan=True):
    # Before 3.46.0, PRAGMA optimize never analyzes tables that lack sqlite_stat1 entries:
    # https://www.sqlite.org/releaselog/3_46_0.html
    if sqlite3.sqlite_version_info >= (3, 46, 0):
        cursor.execute(OPTIMIZE_PRAGMA)
        return
    if sqlite3.sqlite_version_info >= (3, 32, 0):
        # 1000 rows per index, as https://www.sqlite.org/pragma.html#pragma_analysis_limit suggests.
        cursor.execute("PRAGMA analysis_limit=1000;")
    elif not allow_full_scan:
        return
    cursor.execute("ANALYZE;")
