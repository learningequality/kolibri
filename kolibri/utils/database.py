import json
import logging
import os
import sqlite3
from datetime import datetime


logger = logging.getLogger(__name__)


def _collect_violations_by_table(cursor):
    cursor.execute("PRAGMA foreign_key_check;")
    result = cursor.fetchall()
    if len(result) == 0:
        return {}

    violations_by_table = {}
    for row in result:
        bad_table = row[0]
        rowid = row[1]
        if bad_table not in violations_by_table:
            violations_by_table[bad_table] = []
        violations_by_table[bad_table].append(rowid)

    return violations_by_table


def _collect_and_delete_violating_records(cursor, violations_by_table):
    records_to_backup = []

    for bad_table, rowids in violations_by_table.items():
        cursor.execute(f"PRAGMA table_info({bad_table});")
        columns_info = cursor.fetchall()
        column_names = [col[1] for col in columns_info]

        rowid_placeholders = ",".join("?" * len(rowids))
        cursor.execute(
            f"SELECT * FROM {bad_table} WHERE rowid IN ({rowid_placeholders});",
            rowids,
        )
        violating_data = cursor.fetchall()

        for data_row in violating_data:
            fields = dict(zip(column_names, data_row))
            record = {"model": bad_table, "fields": fields}
            records_to_backup.append(record)

        for rowid in rowids:
            cursor.execute(f"DELETE FROM {bad_table} WHERE rowid = {rowid};")
            logger.info(
                f"Deleted foreign key constraint violation from {bad_table} table, rowid {rowid}"
            )

    return records_to_backup


def _backup_records(records_to_backup, db_name):
    from kolibri.core.deviceadmin.utils import default_backup_folder

    backup_dir = default_backup_folder()
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"foreign_key_violations_{db_name}_{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_filename)

    with open(backup_path, "w", encoding="utf-8") as jsonfile:
        json.dump(
            records_to_backup,
            jsonfile,
            separators=(",", ":"),
            ensure_ascii=False,
        )

    logger.info(
        f"Backed up {len(records_to_backup)} violating records to {backup_path}"
    )


def sqlite_check_foreign_keys(database_paths):
    for name in database_paths:
        if not os.path.exists(name):
            continue

        db_connection = sqlite3.connect(name)
        with sqlite3.connect(name) as db_connection:
            cursor = db_connection.cursor()

            violations_by_table = _collect_violations_by_table(cursor)
            if not violations_by_table:
                continue

            logger.warning(
                "Foreign key constraint failed. Trying to fix integrity errors..."
            )

            records_to_backup = _collect_and_delete_violating_records(
                cursor, violations_by_table
            )

            if records_to_backup:
                db_name = os.path.basename(name).replace(".sqlite3", "")
                _backup_records(records_to_backup, db_name)

            db_connection.commit()
