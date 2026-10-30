JOURNAL_SIZE_LIMIT = 4 * 1024 * 1024

# 0x10000 checks every table, not only those the planner used on this connection, and
# 0x10 keeps the temporary analysis_limit that SQLite's recommended 0x10002 drops:
# https://www.sqlite.org/pragma.html#pragma_optimize
OPTIMIZE_PRAGMA = "PRAGMA optimize=0x10012;"

CONNECTION_PRAGMAS = (
    "PRAGMA wal_autocheckpoint=500;"
    f" PRAGMA journal_size_limit={JOURNAL_SIZE_LIMIT};"
    " PRAGMA legacy_alter_table = ON;"
    " PRAGMA synchronous=NORMAL;"
    f" {OPTIMIZE_PRAGMA}"
)

START_PRAGMAS = "PRAGMA journal_mode=WAL;"
