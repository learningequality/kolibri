import copy
import logging
from collections import OrderedDict
from contextlib import contextmanager

from django.conf import settings
from django.db import connections
from django.db import DatabaseError
from django.db import DEFAULT_DB_ALIAS
from django.db import router
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.recorder import MigrationRecorder
from django.db.models import Count
from django.db.models import Q
from django.db.models import Sum

logger = logging.getLogger(__name__)

_COLUMNS_AWAITING_UPGRADE = {
    "content_localfile": {
        "file_size": "kolibri.core.content.upgrade.migrate_file_size_to_bigint",
    },
}


def _columns(fields):
    return tuple(field.column for field in fields)


def _index_description(fields):
    return f"added index on ({', '.join(_columns(fields))})"


def _is_auto_dated(field):
    return getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False)


def _inline_foreign_key(schema_editor, field):
    if not (field.remote_field and field.db_constraint):
        return ""
    if not (
        schema_editor.sql_create_inline_fk
        and schema_editor.connection.features.supports_foreign_keys
    ):
        return ""
    to_meta = field.remote_field.model._meta
    to_column = to_meta.get_field(field.remote_field.field_name).column
    return " " + schema_editor.sql_create_inline_fk % {
        "to_table": schema_editor.quote_name(to_meta.db_table),
        "to_column": schema_editor.quote_name(to_column),
    }


def _restore_connection(connection):
    if not connection.in_atomic_block:
        connection.enable_constraint_checking()
        return
    if connection.savepoint_ids:
        logger.error(
            "Leaving the open transaction on database %s alone: the failed schema editor was nested inside another atomic block",
            connection.alias,
        )
        return
    # copied from Django 3.2's Atomic.__exit__; recheck on a Django upgrade
    connection.in_atomic_block = False
    connection.needs_rollback = False
    connection.rollback()
    connection.set_autocommit(True)
    connection.enable_constraint_checking()


class SchemaDrift:
    __slots__ = (
        "_missing_columns",
        "columns_awaiting_upgrade",
        "connection",
        "extra_columns",
        "extra_indexes",
        "missing_field_indexes",
        "missing_fields",
        "missing_index_together",
        "missing_meta_indexes",
        "missing_unique_constraints",
        "model",
        "nullability_mismatches",
    )

    def __init__(self, connection, cursor, model):
        self.connection = connection
        self.model = model
        meta = model._meta

        description = connection.introspection.get_table_description(
            cursor, meta.db_table
        )
        null_ok_by_column = {info.name: info.null_ok for info in description}
        constraints = connection.introspection.get_constraints(cursor, meta.db_table)
        indexed_columns = {
            tuple(info["columns"]) for info in constraints.values() if info["index"]
        }
        # SQLite reports a table body UNIQUE (...) with index False
        unique_columns = {
            tuple(info["columns"]) for info in constraints.values() if info["unique"]
        }

        self.missing_fields = []
        self.missing_field_indexes = []
        self.nullability_mismatches = []

        for field in meta.local_concrete_fields:
            if field.column not in null_ok_by_column:
                self.missing_fields.append(field)
                continue
            if (
                self._should_be_indexed(field)
                and (field.column,) not in indexed_columns
            ):
                self.missing_field_indexes.append(field)
            if not field.primary_key and null_ok_by_column[field.column] != field.null:
                self.nullability_mismatches.append(field)

        self._missing_columns = {field.column for field in self.missing_fields}

        self.missing_index_together = self._missing_groups(
            (self._index_fields(field_names) for field_names in meta.index_together),
            indexed_columns,
        )
        self.missing_meta_indexes = [
            index
            for index in meta.indexes
            if self._is_missing(self._index_columns(index.fields), indexed_columns)
        ]
        self.missing_unique_constraints = self._missing_groups(
            self._unique_field_groups(), unique_columns
        )
        unexpected_columns = set(null_ok_by_column) - {
            field.column for field in meta.local_concrete_fields
        }
        awaiting_upgrade = _COLUMNS_AWAITING_UPGRADE.get(meta.db_table, {})
        self.columns_awaiting_upgrade = {
            column: awaiting_upgrade[column]
            for column in sorted(unexpected_columns.intersection(awaiting_upgrade))
        }
        self.extra_columns = sorted(unexpected_columns.difference(awaiting_upgrade))
        self.extra_indexes = sorted(
            (indexed_columns | unique_columns) - self._expected_index_columns()
        )

    def __bool__(self):
        return bool(
            self.missing_fields
            or self.extra_columns
            or self.extra_indexes
            or self.needs_table_repair
        )

    @property
    def needs_table_repair(self):
        return bool(
            self.missing_field_indexes
            or self.missing_index_together
            or self.missing_meta_indexes
            or self.missing_unique_constraints
            or self.nullability_mismatches
        )

    @staticmethod
    def _should_be_indexed(field):
        return field.db_index and not field.unique

    def _index_fields(self, field_names):
        return tuple(
            self.model._meta.get_field(name[1:] if name.startswith("-") else name)
            for name in field_names
        )

    def _index_columns(self, field_names):
        return _columns(self._index_fields(field_names))

    def _is_missing(self, columns, present_columns):
        if self._missing_columns.intersection(columns):
            return False
        return columns not in present_columns

    def _missing_groups(self, field_groups, present_columns):
        return [
            fields
            for fields in field_groups
            if self._is_missing(_columns(fields), present_columns)
        ]

    def _expected_index_columns(self):
        meta = self.model._meta
        expected = set()
        for field in meta.local_concrete_fields:
            if field.db_index or field.unique or field.primary_key:
                expected.add((field.column,))
        for index in meta.indexes:
            expected.add(self._index_columns(index.fields))
        for field_names in meta.index_together:
            expected.add(self._index_columns(field_names))
        for field_names in meta.unique_together:
            expected.add(self._index_columns(field_names))
        for constraint in meta.constraints:
            field_names = getattr(constraint, "fields", ())
            if field_names:
                expected.add(self._index_columns(field_names))
        return expected

    def _unique_field_groups(self):
        for field in self.model._meta.local_concrete_fields:
            if field.unique and not field.primary_key:
                yield (field,)
        for field_names in self.model._meta.unique_together:
            yield self._index_fields(field_names)

    def report_extras(self):
        if self.extra_columns:
            logger.error(
                "Table %s holds columns that are not in the migration state, which "
                "will block any rebuild of it and must be resolved by hand: %s",
                self.model._meta.db_table,
                ", ".join(self.extra_columns),
            )
        if self.extra_indexes:
            logger.warning(
                "Table %s holds indexes that are not in the migration state, which a "
                "rebuild of it would drop and which would then have to be recreated "
                "by hand: %s",
                self.model._meta.db_table,
                ", ".join(
                    "(" + ", ".join(columns) + ")" for columns in self.extra_indexes
                ),
            )

    def repair_columns(self):
        return self._repair(self._add_missing_columns)

    def repair_table(self):
        return self._repair(self._restore_table)

    def _repair(self, repair):
        try:
            with self.connection.schema_editor() as schema_editor:
                return repair(schema_editor)
        except DatabaseError:
            _restore_connection(self.connection)
            logger.exception(
                "Could not repair the schema of %s, which is left to be reported again on the next startup",
                self.model._meta.label,
            )
            return []

    def _add_missing_columns(self, schema_editor):
        added = (
            self._add_column(schema_editor, field) for field in self.missing_fields
        )
        return [column for column in added if column is not None]

    def _restore_table(self, schema_editor):
        duplicate_counts = self._duplicate_counts()
        if self.nullability_mismatches:
            rebuilt = self._rebuild_table(schema_editor, duplicate_counts)
            if rebuilt is not None:
                return rebuilt
        return self._add_indexes_and_constraints(schema_editor, duplicate_counts)

    def _add_column(self, schema_editor, field):
        if field.primary_key or field.unique:
            logger.error(
                "Cannot restore column %s on %s: primary key and unique columns cannot be added to an existing table",
                field.column,
                self.model._meta.label,
            )
            return None
        nullable = copy.deepcopy(field)
        nullable.null = True
        definition, params = schema_editor.column_sql(
            self.model, nullable, include_default=False
        )
        check = field.db_parameters(connection=schema_editor.connection)["check"]
        if check:
            definition += " " + schema_editor.sql_check_constraint % {"check": check}
        definition += _inline_foreign_key(schema_editor, field)
        quoted_table = schema_editor.quote_name(self.model._meta.db_table)
        quoted_column = schema_editor.quote_name(field.column)
        schema_editor.execute(
            schema_editor.sql_create_column
            % {
                "table": quoted_table,
                "column": quoted_column,
                "definition": definition,
            },
            params,
        )
        backfilled = ""
        if not field.null:
            default = schema_editor.effective_default(field)
            if default is not None:
                schema_editor.execute(
                    f"UPDATE {quoted_table} SET {quoted_column} = %s",
                    [default],
                )
                if _is_auto_dated(field):
                    backfilled = ", backfilled with the time of this repair"
        return f"added column {field.column}{backfilled}"

    def _rebuild_table(self, schema_editor, duplicate_counts):
        null_counts = {}
        blockers = self._state_blockers()
        if not blockers:
            null_counts = self._null_counts()
            blockers = self._data_blockers(schema_editor, null_counts, duplicate_counts)
        if blockers:
            logger.error(
                "Cannot rebuild table %s: %s, and must be resolved by hand",
                self.model._meta.db_table,
                "; ".join(blockers),
            )
            return None

        filled = self._fill_nulls(schema_editor, null_counts)
        schema_editor._remake_table(self.model)
        if filled:
            return [f"rebuilt the table, first filling NULLs in {', '.join(filled)}"]
        return ["rebuilt the table"]

    def _add_indexes_and_constraints(self, schema_editor, duplicate_counts):
        model = self.model
        repaired = []

        for index in self.missing_meta_indexes:
            schema_editor.add_index(model, index)
            repaired.append(_index_description(self._index_fields(index.fields)))

        for fields in self.missing_index_together:
            schema_editor.alter_index_together(
                model, [], [[field.name for field in fields]]
            )
            repaired.append(_index_description(fields))

        for field in self.missing_field_indexes:
            schema_editor.execute(
                schema_editor._create_index_sql(model, fields=[field])
            )
            repaired.append(_index_description([field]))

        for fields in self.missing_unique_constraints:
            columns = ", ".join(_columns(fields))
            duplicates = duplicate_counts.get(fields)
            if duplicates:
                logger.error(
                    "Cannot restore unique constraint on %s (%s): %s rows are duplicates "
                    "and must be resolved by hand",
                    model._meta.label,
                    columns,
                    duplicates,
                )
                continue
            schema_editor.alter_unique_together(
                model, [], [[field.name for field in fields]]
            )
            repaired.append(f"added unique constraint on ({columns})")

        return repaired

    def _state_blockers(self):
        return (
            [f"column {field.column} is missing" for field in self.missing_fields]
            + [
                f"column {column} is not in the migration state"
                for column in self.extra_columns
            ]
            + [
                f"column {column} awaits the {upgrade} upgrade"
                for column, upgrade in self.columns_awaiting_upgrade.items()
            ]
        )

    def _data_blockers(self, schema_editor, null_counts, duplicate_counts):
        return [
            f"{count} rows hold NULL in {field.column}, which has no default to fill them with"
            for field, count in null_counts.items()
            if schema_editor.effective_default(field) is None
        ] + [
            f"{count} rows are duplicates over ({', '.join(_columns(fields))})"
            for fields, count in duplicate_counts.items()
        ]

    def _null_counts(self):
        fields = [field for field in self.nullability_mismatches if not field.null]
        if not fields:
            return {}
        counts = self._queryset().aggregate(
            **{
                f"nulls_{field.name}": Count(
                    "pk", filter=Q(**{f"{field.name}__isnull": True})
                )
                for field in fields
            }
        )
        return {
            field: counts[f"nulls_{field.name}"]
            for field in fields
            if counts[f"nulls_{field.name}"]
        }

    def _fill_nulls(self, schema_editor, null_counts):
        quoted_table = schema_editor.quote_name(self.model._meta.db_table)
        filled = []
        for field in null_counts:
            quoted_column = schema_editor.quote_name(field.column)
            schema_editor.execute(
                f"UPDATE {quoted_table} SET {quoted_column} = %s WHERE {quoted_column} IS NULL",
                [schema_editor.effective_default(field)],
            )
            filled.append(field.column)
        return filled

    def _duplicate_counts(self):
        counts = {}
        for fields in self.missing_unique_constraints:
            duplicates = self._duplicate_row_count(fields)
            if duplicates:
                counts[fields] = duplicates
        return counts

    def _duplicate_row_count(self, fields):
        queryset = self._queryset()
        for field in fields:
            if field.null:
                queryset = queryset.exclude(**{f"{field.name}__isnull": True})
        duplicates = (
            queryset.values(*[field.name for field in fields])
            .annotate(row_count=Count("pk"))
            .filter(row_count__gt=1)
        )
        return duplicates.aggregate(rows=Sum("row_count"))["rows"] or 0

    def _queryset(self):
        return self.model._default_manager.using(self.connection.alias).order_by()


def _models_to_check(connection, cursor, loader, apps):
    table_names = connection.introspection.table_names(cursor)
    for model in apps.get_models(include_auto_created=True):
        # Django's StateApps renders apps without migrations with their relations excluded
        if model._meta.app_label in loader.unmigrated_apps:
            continue
        if not model._meta.can_migrate(connection):
            continue
        if not router.allow_migrate_model(connection.alias, model):
            continue
        if model._meta.db_table not in table_names:
            logger.error(
                "Table %s for model %s is missing from database %s",
                model._meta.db_table,
                model._meta.label,
                connection.alias,
            )
            continue
        yield model


def _find_schema_drift(connection):
    executor = MigrationExecutor(connection)
    leaf_nodes = executor.loader.graph.leaf_nodes()
    unapplied = executor.migration_plan(leaf_nodes)
    if unapplied:
        logger.warning(
            "Skipping schema drift detection on database %s, %s migrations are unapplied: %s",
            connection.alias,
            len(unapplied),
            ", ".join(
                sorted(
                    f"{migration.app_label}.{migration.name}"
                    for migration, _ in unapplied
                )
            ),
        )
        return []

    apps = executor.loader.project_state(leaf_nodes).apps

    with connection.cursor() as cursor:
        return [
            drift
            for drift in (
                SchemaDrift(connection, cursor, model)
                for model in _models_to_check(connection, cursor, executor.loader, apps)
            )
            if drift
        ]


def _duplicate_migration_records(connection):
    recorder = MigrationRecorder(connection)
    if not recorder.has_table():
        return []
    recorded = set()
    duplicates = []
    for record in recorder.migration_qs.order_by("id").values("id", "app", "name"):
        migration = (record["app"], record["name"])
        if migration in recorded:
            duplicates.append(record["id"])
        else:
            recorded.add(migration)
    return duplicates


def _reconcile_migration_records(connection):
    executor = MigrationExecutor(connection)
    if executor.migration_plan(executor.loader.graph.leaf_nodes()):
        return

    duplicates = _duplicate_migration_records(connection)
    if not duplicates:
        return

    MigrationRecorder(connection).migration_qs.filter(id__in=duplicates).delete()
    logger.info(
        "Removed %s duplicate migration records left in database %s by two processes "
        "migrating it at once",
        len(duplicates),
        connection.alias,
    )


def _start_repair(repaired, drift):
    label = drift.model._meta.label
    if label not in repaired:
        logger.info(
            "Repairing the schema of %s (table %s), which may take some minutes",
            label,
            drift.model._meta.db_table,
        )
        repaired[label] = []
    return repaired[label]


def _finish_repair(label, items):
    logger.info(
        "Repaired the schema of %s: %s",
        label,
        ", ".join(items) or "nothing could be repaired",
    )


def _repair_database(connection):
    drifts = _find_schema_drift(connection)
    if not drifts:
        _reconcile_migration_records(connection)
        return

    for drift in drifts:
        drift.report_extras()

    repaired = OrderedDict()

    for drift in drifts:
        if drift.missing_fields:
            _start_repair(repaired, drift).extend(drift.repair_columns())

    if any(repaired.values()):
        drifts = _find_schema_drift(connection)

    table_drifts = [drift for drift in drifts if drift.needs_table_repair]
    awaiting_table_repair = {drift.model._meta.label for drift in table_drifts}
    for label, items in repaired.items():
        if label not in awaiting_table_repair:
            _finish_repair(label, items)

    for drift in table_drifts:
        items = _start_repair(repaired, drift)
        items.extend(drift.repair_table())
        _finish_repair(drift.model._meta.label, items)


def _repair_database_quick_check(connection):
    if not _duplicate_migration_records(connection):
        return
    logger.info(
        "Database %s was migrated by two processes at once, checking it for schema drift",
        connection.alias,
    )
    _repair_database(connection)


def _is_sqlite():
    return connections[DEFAULT_DB_ALIAS].vendor == "sqlite"


@contextmanager
def _connection_to_repair(database):
    connection = connections[database]
    was_closed = connection.connection is None
    try:
        try:
            yield connection
        finally:
            if was_closed:
                connection.close()
    except Exception:
        logger.exception("Could not repair schema drift on database %s", database)


def repair_schema_drift():
    if not _is_sqlite():
        return
    for database in settings.DATABASES:
        with _connection_to_repair(database) as connection:
            _repair_database(connection)


def repair_schema_drift_quick_check():
    if not _is_sqlite():
        return
    for database in settings.DATABASES:
        with _connection_to_repair(database) as connection:
            _repair_database_quick_check(connection)
