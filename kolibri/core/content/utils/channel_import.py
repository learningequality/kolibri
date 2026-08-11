import io
import json
import logging
import time
from contextlib import ExitStack
from itertools import islice

from django.apps import apps
from django.core.management.base import CommandError
from django.db import connections
from django.db import OperationalError
from django.db import transaction
from django.db.models import AutoField
from django.db.models import Case
from django.db.models import Value
from django.db.models import When
from django.db.models.fields.related import ForeignKey
from django.utils.functional import cached_property

from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.constants.kind_to_learningactivity import kind_activity_map
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import NO_VERSION
from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.constants.schema_versions import V040BETA3
from kolibri.core.content.constants.schema_versions import VERSION_1
from kolibri.core.content.constants.schema_versions import VERSION_2
from kolibri.core.content.constants.schema_versions import VERSION_3
from kolibri.core.content.constants.schema_versions import VERSION_4
from kolibri.core.content.constants.schema_versions import VERSION_5
from kolibri.core.content.constants.schema_versions import VERSION_6
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.legacy_models import License
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import set_channel_ancestors
from kolibri.core.content.utils.annotation import update_channel_version_to_assignments
from kolibri.core.content.utils.content_types_tools import renderable_preset_bits
from kolibri.core.content.utils.search import annotate_label_bitmasks
from kolibri.core.content.utils.search import annotate_modality
from kolibri.core.errors import KolibriUpgradeError
from kolibri.utils.time_utils import local_now

from .channels import read_channel_metadata_from_db_file
from .content_db import attached_database
from .content_db import content_db
from .content_db import create_schema
from .paths import get_content_database_file_path
from .source_db import SourceDB

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

merge_models = [ContentTag, LocalFile, Language]

models_not_to_overwrite = [LocalFile]

# Models that are in the content app, but for which we do not want to generate a schema.
no_schema_models = [
    apps.get_model(CONTENT_APP_NAME, "ContentRequest"),
    apps.get_model(CONTENT_APP_NAME, "ContentDownloadRequest"),
    apps.get_model(CONTENT_APP_NAME, "ContentRemovalRequest"),
]

models_to_exclude = [
    apps.get_model(CONTENT_APP_NAME, "ChannelMetadata_included_languages"),
] + no_schema_models


SOURCE_DB_ALIAS = "sourcedb"


class ImportCancelError(Exception):
    pass


def convert_to_sqlite_value(python_value):
    if isinstance(python_value, bool):
        return "1" if python_value else "0"
    if python_value is None:
        return "null"
    if isinstance(python_value, dict) or isinstance(python_value, list):
        return '"{}"'.format(json.dumps(python_value))
    return repr(python_value)


def clean_csv_value(value):
    if value is None:
        return r"\N"
    return (
        str(value)
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
        .replace("\\.", ".")
    )


class StringIteratorIO(io.TextIOBase):
    def __init__(self, iter):
        self._iter = iter
        self._buff = ""

    def readable(self):
        return True

    def _read1(self, n=None):
        while not self._buff:
            try:
                self._buff = next(self._iter)
            except StopIteration:
                break
        ret = self._buff[:n]
        self._buff = self._buff[len(ret) :]
        return ret

    def read(self, n=None):
        buff = []
        if n is None or n < 0:
            while True:
                m = self._read1()
                if not m:
                    break
                buff.append(m)
        else:
            while n > 0:
                m = self._read1(n)
                if not m:
                    break
                n -= len(m)
                buff.append(m)
        return "".join(buff)


BATCH_SIZE = 1000


def batched(rows, size=BATCH_SIZE):
    """
    Yield lists of up to size rows drawn from rows.

    Source rows stream, so each batch is drawn from one iterator. Slicing with an
    advancing offset instead would skip a batch for every batch it took.
    """
    rows = iter(rows)
    while True:
        batch = list(islice(rows, size))
        if not batch:
            return
        yield batch


def _detach_source_database(attached):
    """
    Detach the source database, best effort.

    Unwinding happens after the import has committed, so raising here would skip the
    annotation that follows a successful import and leave the channel unannotated.
    The alias' connection is closed at the end of the import either way.
    """
    try:
        attached.close()
    except OperationalError:
        logger.warning("Unable to detach the source content database", exc_info=True)


def _get_dependencies(content_models):
    references = {}
    for model in content_models:
        meta = model._meta
        for f in meta.concrete_fields:
            if f.is_relation and f.many_to_one:
                if f.related_model not in references:
                    references[f.related_model] = set()
                if f.related_model is not model:
                    references[f.related_model].add(model)
    return references


def topological_sort(content_models):
    """
    Carries out a depth first search topological sort of content models to ensure we
    import them in the correct order.
    ref: https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
    """
    # First collect all non-self referential foreign key references
    # in the set of models. We can't resolve the self-referentiality in a topological
    # sort, so we simply ignore it.
    references = _get_dependencies(content_models)

    sorted_models = []
    visiting = set()

    def visit(n):
        if n in sorted_models:
            return
        if n in visiting:
            raise ReferenceError(n)
        visiting.add(n)
        for m in references.get(n, set()):
            visit(m)
        visiting.remove(n)
        sorted_models.insert(0, n)

    for model in content_models:
        visit(model)

    return sorted_models


def get_attribute(obj, key, default):
    """
    Get an attribute from an object, regardless of whether it is a dict or an object
    """
    if not isinstance(obj, dict):
        return getattr(obj, key, default)
    return obj.get(key, default)


class _DataSource:
    """
    A dict of table name to row dicts, behind the same reading interface as SourceDB.
    """

    # No file to attach; SourceDB carries the path it was opened on.
    path = None

    def __init__(self, data):
        self.data = data
        self.schema_version = data["schema_version"]

    def rows(self, table, columns=None):
        # columns is accepted and ignored: dict rows are whatever the sending peer
        # serialised, and projecting them would change what a partial import writes.
        return self.data.get(table, [])

    def close(self):
        pass


class ChannelImport:
    """
    The ChannelImport class has two functions:

    1) it acts as the default import pattern for importing content databases that have naively compatible version
    with the current version of Kolibri (i.e. no explicit mappings are required to bring data from the content db
    into the main db, as there is a one to one correspondence in table names and column names within tables).

    2) It is also the base class for any more complex import that requires explicit schema mappings from one version
    to another.
    """

    _sqlite_db_attached = False

    # Specific instructions and exceptions for importing table from previous versions of Kolibri
    # Mappings can be:
    # 1) 'per_row', specifying mappings for an entire row, string can either be an attribute
    #    or a method name on the import class
    # 2) 'per_table' mapping an entire table at a time. Only a method name can be used for 'per_table' mappings.
    #
    # Both can be used simultaneously.
    #
    # See NoVersionChannelImport for an annotated example.

    schema_mapping = {
        ContentNode: {
            "per_row": {
                "tree_id": "available_tree_id",
                "available": "default_to_not_available",
            }
        },
        LocalFile: {"per_row": {"available": "default_to_not_available"}},
        File: {"per_row": {"available": "default_to_not_available"}},
    }

    def __init__(
        self,
        channel_id,
        source,
        channel_version=None,
        cancel_check=None,
        destination=None,
        partial=False,
        version_requested=False,
        force_upgrade=False,
    ):
        self.channel_id = channel_id
        self.channel_version = channel_version
        self.version_requested = version_requested
        try:
            self.current_channel = ChannelMetadata.objects.get(id=self.channel_id)
        except ChannelMetadata.DoesNotExist:
            self.current_channel = None

        self.cancel_check = cancel_check

        self.partial = partial
        self.force_upgrade = force_upgrade
        self.channel_upgraded = False

        # Holds the source and the destination alias for the importer's lifetime, and
        # is released by end(), so that a failure partway — the constructor included —
        # leaves neither an open source file nor a registered alias behind.
        self._stack = ExitStack()
        try:
            if isinstance(source, str):
                if self.partial:
                    raise ValueError(
                        "partial init argument to channel import class can only be used with dict imports"
                    )
                # Source is assumed to be a filepath to a SQLite database file
                self.source = SourceDB(source)

            elif isinstance(source, dict):
                # If a dict, should be a mapping from tablenames to lists of the rows of the table
                self.source = _DataSource(source)

            self._stack.callback(self.source.close)

            # The source tables and columns to read, taken from the source's schema
            # version rather than from the file. A published channel database declares
            # more than its version does, and reading those extra columns would import
            # values that today take the model default.
            self._source_shape = for_version(self.source.schema_version)

            self.destination = self._stack.enter_context(content_db(destination))
            if destination is not None:
                # A destination path may point at a file with no content tables yet.
                create_schema(self.destination)

            content_app = apps.get_app_config(CONTENT_APP_NAME)

            # Use this rather than get_models, as it returns a list of all models, including those
            # generated by ManyToMany fields, whereas get_models only returns explicitly defined
            # Model classes
            self.content_models = list(
                content_app.get_models(include_auto_created=True)
            )
            for blacklisted_model in models_to_exclude:
                if blacklisted_model in self.content_models:
                    self.content_models.remove(blacklisted_model)

            self.content_models = topological_sort(self.content_models)

            if self.partial:
                self.available_tree_id = (
                    self.get_destination_channel_tree_id() or self.find_unique_tree_id()
                )
            else:
                # Get the next available tree_id in our database
                self.available_tree_id = self.find_unique_tree_id()
        except Exception:
            self._stack.close()
            raise

        self.default_to_not_available = False

        self.set_blank_text = ""

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.end()

    def get_none(self, source_object):
        return None

    def _destination_nodes(self):
        # ContentNodeManager forces an order_by(tree_id, lft) onto every queryset,
        # which corrupts a distinct and leaks columns into a subquery.
        return ContentNode.objects.using(self.destination).order_by()

    def get_destination_channel_tree_id(self):
        # Sliced rather than .first(), which orders an unordered queryset by primary
        # key: the id is a UUID with no index covering this filter, so that would
        # sort the channel's whole tree into a temp b-tree to read one integer.
        return next(
            iter(
                self._destination_nodes()
                .filter(channel_id=self.channel_id)
                .values_list("tree_id", flat=True)[:1]
            ),
            None,
        )

    def get_all_destination_tree_ids(self):
        return sorted(
            self._destination_nodes().values_list("tree_id", flat=True).distinct()
        )

    def find_unique_tree_id(self):
        tree_ids = self.get_all_destination_tree_ids()
        # If there are no pre-existing tree_ids just escape here and return 1
        if not tree_ids:
            return 1
        if len(tree_ids) == 1:
            if tree_ids[0] == 1:
                return 2
            return 1

        # Do a binary search to find the lowest unused tree_id
        def find_hole_in_list(ids):
            last = len(ids) - 1
            middle = int(last / 2 + 1)
            # Check if the lower half of ids has a hole in it
            if ids[middle] - ids[0] != middle:
                # List is only two ids, so hole must be between them
                if middle == 1:
                    return ids[0] + 1
                return find_hole_in_list(ids[:middle])
            # Otherwise check if there is a hole in the second half
            if ids[last] - ids[middle] != last - middle:
                # Second half is only two ids so hole must be between them
                if last - middle == 1:
                    return ids[middle] + 1
                return find_hole_in_list(ids[middle:])
            # We should only reach this point in the first iteration, if there are no holes in either
            # the first or the last half of the list, therefore, we just take the max of the list plus 1
            # Because the list is already sorted, we can just take the last value
            return ids[-1] + 1

        return find_hole_in_list(tree_ids)

    def generate_row_mapper(self, mappings=None):
        # If no mappings, just use an empty object
        if mappings is None:
            # If no mappings have been specified, we can just skip direct to
            # the default return value without doing any other checks
            return self.base_row_mapper

        _missing = object()

        def mapper(record, column):
            """
            A mapper function for the mappings object
            """
            if column in mappings:
                # If the column name is in our defined mappings object,
                # then we need to try to find an alternate value
                col_map = mappings.get(column)  # Get the string value for the mapping
                value = get_attribute(record, col_map, _missing)
                if value is not _missing:
                    return value
                elif hasattr(self, col_map):
                    # Otherwise, check to see if the import class has an attribute with this name
                    # We assume that if it is, then it is either a literal value or a callable method
                    # that accepts the row data as its only argument, and if so, return the result of
                    # calling that method on the row data
                    mapping = getattr(self, col_map)
                    if callable(mapping):
                        return mapping(record)
                    return mapping
                else:
                    # If neither of these true, we specified a column mapping that is invalid
                    raise AttributeError(
                        "Column mapping specified but no valid column name or method found"
                    )
            else:
                # Otherwise, we can just get the value directly from the record
                return self.base_row_mapper(record, column)

        # Return the mapper function for repeated use
        return mapper

    def _source_table(self, model):
        """
        The name of the model's table in the source, or None if the source's schema
        version does not declare it — in which case a per_table mapping has to
        supply the rows instead.
        """
        table = model._meta.db_table
        return table if table in self._source_shape else None

    def base_table_mapper(self, source_table):
        # If source_table is None, then the source table does not exist in the DB
        if source_table is not None:
            return self.source.rows(
                source_table, columns=self._source_shape[source_table]
            )
        return []

    def base_row_mapper(self, record, column):
        # By default just return value directly from the record
        return get_attribute(record, column, None)

    def generate_table_mapper(self, table_map=None):
        if table_map is None:
            # If no table mapping specified, just use the default
            return self.base_table_mapper
        # Can only be a method on the Import object
        if hasattr(self, table_map):
            # If it is a method of the import class return that method for later use
            return getattr(self, table_map)
        # If we got here, there is an invalid table mapping
        raise AttributeError("Table mapping specified but no valid method found")

    def _destination_columns(self, model):
        """
        The columns to write for a model, paired with the field each comes from.

        Taken from the export schema rather than the current one, so that fields
        which are annotated after import are never written.
        """
        fields = {field.column: field for field in model._meta.concrete_fields}
        return [
            (column, fields[column])
            for column in for_version(CONTENT_SCHEMA_VERSION)[model._meta.db_table]
            # Auto integer primary keys only exist on the many to many through tables;
            # letting the database assign them avoids collisions with existing rows.
            if not (
                fields[column].primary_key and isinstance(fields[column], AutoField)
            )
        ]

    @staticmethod
    def _column_default(field):
        # Guarded, because get_default() invents "" for a non-null CharField that
        # declares no default, where the column has none.
        return (
            field.get_prep_value(field.get_default()) if field.has_default() else None
        )

    @staticmethod
    def _column_max_length(field):
        """
        The width to truncate a value to before writing it, or None to write it whole.

        A ForeignKey's own max_length is None while the column it creates is as wide
        as the key it points at, so a relation resolves through its target.
        """
        if field.primary_key:
            return None
        return (field.target_field if field.is_relation else field).max_length

    def _sqlite_method(self, model):
        if model in models_not_to_overwrite:
            return "INSERT OR IGNORE"
        return "INSERT OR REPLACE"

    def _sqlite_attach_column_expression(self, source_columns, mapper):
        """
        The SQL expression a per_row mapping resolves to on the ATTACH path, or
        None if it cannot be expressed in SQL. The order mirrors
        generate_row_mapper: source column wins over class attribute.
        """
        if mapper in source_columns:
            return "source." + mapper
        if hasattr(self, mapper):
            mapattr = getattr(self, mapper)
            if not callable(mapattr):
                return convert_to_sqlite_value(mapattr)
        return None

    def raw_attached_sqlite_table_import(self, model, table_mapper):
        self.check_cancelled()

        source_columns = set(self._source_shape[model._meta.db_table])

        # check the schema map and resolve any mapped fields to SQL expressions
        field_expressions = {}
        schema_map = self.schema_mapping.get(model)
        if schema_map:
            for field, mapper in schema_map.get("per_row", {}).items():
                expression = self._sqlite_attach_column_expression(
                    source_columns, mapper
                )
                if expression is None:
                    raise Exception(
                        f"Can't use SQLITE table import method for column '{field}' with mapping '{mapper}'"
                    )
                field_expressions[field] = expression

        # build a list of values (constants or source table column references) to be inserted
        dest_columns = []
        source_vals = []
        for col, field in self._destination_columns(model):
            dest_columns.append(col)
            if col in field_expressions:
                # a mapped column wins even when the source carries that name too
                val = field_expressions[col]
            elif col in source_columns:
                # pull the value from the column on the source table if it exists
                val = "source." + col
            else:
                # get the default value from the target model and use that, if the source table didn't have the field
                val = convert_to_sqlite_value(field.get_default())
            source_vals.append(val)

        # build and execute a raw SQL query to transfer the data in one fell swoop
        query = '{method} INTO "{table}" ({destcols}) SELECT {sourcevals} FROM {alias}."{table}" AS source'.format(
            method=self._sqlite_method(model),
            table=model._meta.db_table,
            # quote column names in case they are sql keywords (ex. order)
            destcols=", ".join('"{}"'.format(col) for col in dest_columns),
            sourcevals=", ".join(source_vals),
            alias=SOURCE_DB_ALIAS,
        )
        with connections[self.destination].cursor() as cursor:
            cursor.execute(query)

    def sqlite_table_import(self, model, row_mapper, table_mapper):
        source_table = self._source_table(model)

        columns = self._destination_columns(model)
        self.check_cancelled()

        column_names = [column for column, _ in columns]
        column_defaults = [
            (column, self._column_default(field)) for column, field in columns
        ]

        query = '{method} INTO "{table}" ({destcols}) VALUES ({placeholders})'.format(
            method=self._sqlite_method(model),
            table=model._meta.db_table,
            # quote column names in case they are sql keywords (ex. order)
            destcols=", ".join('"{}"'.format(column) for column in column_names),
            placeholders=", ".join(["%s"] * len(column_names)),
        )

        def row_values(record):
            values = []
            for column, default in column_defaults:
                value = row_mapper(record, column)
                values.append(default if value is None else value)
            return values

        with connections[self.destination].cursor() as cursor:
            for records in batched(table_mapper(source_table)):
                cursor.executemany(query, map(row_values, records))

    def postgres_table_import(self, model, row_mapper, table_mapper):
        source_table = self._source_table(model)

        table = model._meta.db_table
        columns = self._destination_columns(model)
        column_names = [column for column, _ in columns]
        column_specs = [
            (column, self._column_default(field), self._column_max_length(field))
            for column, field in columns
        ]
        # For partial updates we don't delete pre-existing data
        # so as a precaution we treat all models as merge models
        # which will allow us to merge into any existing data.
        merge = model in merge_models or self.partial
        do_not_overwrite = model in models_not_to_overwrite
        self.check_cancelled()

        results = table_mapper(source_table)

        def generate_data_with_default(record):
            for column, default, max_length in column_specs:
                value = row_mapper(record, column)
                if max_length is not None:
                    value = value[:max_length] if value is not None else default

                yield default if value is None else value

        with connections[self.destination].cursor() as cursor:
            if not merge:
                separator = "\t"
                data_string_iterator = StringIteratorIO(
                    (
                        separator.join(
                            map(clean_csv_value, generate_data_with_default(record))
                        )
                        + "\n"
                        for record in results
                    )
                )

                cursor.copy_from(
                    data_string_iterator,
                    table,
                    sep=separator,
                    columns=column_names,
                )
            else:
                pk_name = model._meta.pk.column
                if do_not_overwrite:
                    conflict_action = "DO NOTHING"
                else:
                    conflict_action = "DO UPDATE SET " + ", ".join(
                        # Here we generate a value assignment for the set statement for
                        # each column, except for the primary key column, which we leave alone.
                        # We set the column value to COALESCE (take the first non-null value)
                        # from either the value we tried to set (EXCLUDED) or the original value
                        # (SOURCE) - this should have the effect of replacing columns for which
                        # we have a value to insert, but ignoring columns that we do not.
                        "{column} = COALESCE(EXCLUDED.{column}, SOURCE.{column})".format(
                            column=column_name
                        )
                        for column_name in column_names
                        if column_name != pk_name
                    )

                for records in batched(results):
                    values_str = ", ".join(
                        cursor.mogrify(
                            "({})".format(", ".join(["%s"] * len(column_names))),
                            tuple(generate_data_with_default(record)),
                        ).decode("utf-8")
                        for record in records
                    )
                    cursor.execute(
                        "INSERT INTO {table} AS SOURCE ({column_names}) "
                        "VALUES {values_str} "
                        "ON CONFLICT ({pk_name}) {conflict_action};".format(
                            table=table,
                            column_names=", ".join(column_names),
                            values_str=values_str,
                            pk_name=pk_name,
                            conflict_action=conflict_action,
                        )
                    )

    def can_use_sqlite_attach_method(self, model, table_mapper):
        if self.source.path is None:
            return False
        # Check whether we can directly "attach" the sqlite database and do a one-line transfer
        # First check that we are not doing any mapping to construct the tables
        can_use_attach = table_mapper == self.base_table_mapper
        # Check that the table is in the source database (otherwise we can't use the ATTACH method)
        source_table = self._source_table(model)
        if source_table is None:
            return False
        # Now check that the schema mapping doesn't contain anything that we don't know how to handle
        schema_map = self.schema_mapping.get(model)
        if schema_map:
            # Check that the only thing in the schema map is row mappings
            can_use_attach = (
                can_use_attach and len(set(schema_map.keys()) - set(["per_row"])) == 0
            )
            # Check that all the row mappings defined for this table are things we can express in SQL
            source_columns = set(self._source_shape[source_table])
            for row_mapping in set(schema_map.get("per_row", {}).values()):
                if (
                    self._sqlite_attach_column_expression(source_columns, row_mapping)
                    is None
                ):
                    return False
        # Check that the engine being used is sqlite, and it's been attached
        can_use_attach = can_use_attach and self._sqlite_db_attached

        return can_use_attach

    def table_import(self, model, row_mapper, table_mapper):
        if connections[self.destination].vendor == "postgresql":
            result = self.postgres_table_import(model, row_mapper, table_mapper)
        elif self.can_use_sqlite_attach_method(model, table_mapper):
            result = self.raw_attached_sqlite_table_import(model, table_mapper)
        else:
            result = self.sqlite_table_import(model, row_mapper, table_mapper)

        return result

    def check_and_delete_existing_channel(self):
        if self.current_channel:
            current_version = self.current_channel.version
            current_partial = self.current_channel.partial
            if self.partial:
                if current_version == self.channel_version:
                    return True

                if not self.force_upgrade or self.channel_version < current_version:
                    # We have previously loaded this channel, with a different version to the metadata we are trying to insert
                    logger.warning(
                        (
                            "Version {channel_version} of channel {channel_id} already exists in database; cancelling partial import of "
                            + "version {new_channel_version}"
                        ).format(
                            channel_version=current_version,
                            channel_id=self.channel_id,
                            new_channel_version=self.channel_version,
                        )
                    )
                    return False

            if current_version is not None and (
                current_version < self.channel_version
                or current_partial
                or (self.version_requested and current_version > self.channel_version)
            ):
                # We have a different version of this channel (upgrade, downgrade, or partial),
                # so clean out the old data first.
                logger.info(
                    (
                        "Version {channel_version} of channel {channel_id} already exists in database; removing old entries "
                        + "to import version {new_channel_version}"
                    ).format(
                        channel_version=current_version,
                        channel_id=self.channel_id,
                        new_channel_version=self.channel_version,
                    )
                )

                tree_id = (
                    self._destination_nodes()
                    .filter(id=self.current_channel.root_id)
                    .values_list("tree_id", flat=True)
                    .first()
                )

                self.delete_old_channel_many_to_many_fields(self.channel_id)
                if tree_id is not None:
                    self.delete_old_channel_tree_data(tree_id)
                self.channel_upgraded = True

            else:
                # We have previously fully loaded this channel with the same version, or a newer
                # version without an explicit version request — nothing to import.
                logger.warning(
                    (
                        "Version {channel_version} of channel {channel_id} already exists in database; cancelling import of "
                        + "version {new_channel_version}"
                    ).format(
                        channel_version=current_version,
                        channel_id=self.channel_id,
                        new_channel_version=self.channel_version,
                    )
                )
                return False

        return True

    def _can_use_optimized_pre_deletion(self, model):
        # check whether we can skip fully deleting this model, if we'll be using REPLACE on it anyway
        mapping = self.schema_mapping.get(model, {})
        table_mapper = self.generate_table_mapper(mapping.get("per_table"))
        return self.can_use_sqlite_attach_method(model, table_mapper)

    def delete_old_channel_many_to_many_fields(self, channel_id):
        # Delete all many to many through entries for the channel
        # being deleted to prevent referential integrity errors in Postgresql.
        for m2m in ChannelMetadata._meta.local_many_to_many:
            through = getattr(ChannelMetadata, m2m.attname).through
            through.objects.using(self.destination).filter(
                channelmetadata_id=channel_id
            ).delete()

    def delete_old_channel_tree_data(self, old_tree_id):
        # we want to delete all content models, but not "merge models" (ones that might also be used by other channels), and ContentNode last
        models_to_delete = [
            model
            for model in self.content_models
            if model is not ContentNode and model not in merge_models
        ] + [ContentNode]

        contentnode_table = ContentNode._meta.db_table

        # Raw SQL rather than the ORM, so that the NOT IN below can reference the
        # attached source database, which no queryset can name, and so that deleting
        # a tree does not load it through Django's collector.
        with connections[self.destination].cursor() as cursor:
            for model in models_to_delete:
                table = model._meta.db_table

                # we do a few things differently if it's the ContentNode model, vs a model related to ContentNode
                if model is ContentNode:
                    where = "tree_id = %s"
                    params = [old_tree_id]
                else:
                    columns = [
                        f.column
                        for f in model._meta.fields
                        if isinstance(f, ForeignKey)
                        and f.target_field.model is ContentNode
                    ]
                    # match on each field this model has that foreignkeys onto ContentNode
                    where = " OR ".join(
                        '"{column}" IN (SELECT id FROM "{contentnode}" WHERE tree_id = %s)'.format(
                            column=column, contentnode=contentnode_table
                        )
                        for column in columns
                    )
                    params = [old_tree_id] * len(columns)

                # if the external database is attached and there are no incompatible schema mappings for a table,
                # and it doesn't use an autoincrementing integer pk
                # we can skip deleting records that will be REPLACED during import, which helps efficiency
                if self._can_use_optimized_pre_deletion(model) and not isinstance(
                    model._meta.pk, AutoField
                ):
                    where = '({where}) AND NOT "{pk_name}" IN (SELECT id FROM {alias}."{table}")'.format(
                        where=where,
                        pk_name=model._meta.pk.column,
                        table=table,
                        alias=SOURCE_DB_ALIAS,
                    )

                # check that the import operation hasn't since been cancelled
                self.check_cancelled()

                cursor.execute(
                    'DELETE FROM "{table}" WHERE {where}'.format(
                        table=table, where=where
                    ),
                    params,
                )

    def check_cancelled(self):
        if callable(self.cancel_check):
            check = self.cancel_check()
        else:
            check = bool(self.cancel_check)
        if check:
            raise ImportCancelError("Channel import was cancelled")

    def try_attaching_sqlite_database(self, stack):
        # attach the external content database to our primary database so we can directly transfer records en masse
        if connections[self.destination].vendor == "sqlite" and self.source.path:
            attached = ExitStack()
            try:
                attached.enter_context(
                    attached_database(
                        self.destination, self.source.path, SOURCE_DB_ALIAS
                    )
                )
            except OperationalError:
                # silently ignore if we were unable to attach the database; we'll just fall back to other methods
                return
            stack.callback(_detach_source_database, attached)
            self._sqlite_db_attached = True
            stack.callback(setattr, self, "_sqlite_db_attached", False)

    def execute_post_operations(self, model, post_operations):
        for operation in post_operations:
            try:
                handler = getattr(self, operation)
            except AttributeError:
                raise AttributeError(
                    "Post operation {} specified for model {} but none found on class".format(
                        operation, model
                    )
                )
            handler()

    def _import_models(self):
        for model in self.content_models:
            model_start = time.time()
            mapping = self.schema_mapping.get(model, {})
            row_mapper = self.generate_row_mapper(mapping.get("per_row"))
            table_mapper = self.generate_table_mapper(mapping.get("per_table"))
            logger.info("Importing {model} data".format(model=model.__name__))
            self.table_import(model, row_mapper, table_mapper)
            self.execute_post_operations(model, mapping.get("post", []))
            logger.debug(
                "{model} data imported after {seconds} seconds".format(
                    model=model.__name__, seconds=time.time() - model_start
                )
            )

    def import_channel_data(self):
        logger.debug("Beginning channel metadata import")
        start = time.time()
        import_ran = False

        connection = connections[self.destination]
        if connection.vendor == "sqlite" and connection.in_atomic_block:
            # SQLite ignores a foreign_keys pragma issued inside a transaction, so
            # constraint_checks_disabled() below would silently leave per statement
            # foreign keys on and the import would fail on the first forward
            # reference. Refuse rather than fail partway.
            raise RuntimeError(
                "A channel import cannot run inside a transaction on its destination database"
            )
        with ExitStack() as stack:
            self.try_attaching_sqlite_database(stack)
            if connection.vendor == "sqlite":
                # Entered before the atomic block below, per the guard above.
                # PostgreSQL needs nothing here: Django declares its foreign keys
                # DEFERRABLE INITIALLY DEFERRED, so they are checked at the end
                # either way.
                stack.enter_context(connection.constraint_checks_disabled())
            with transaction.atomic(using=self.destination):
                if self.check_and_delete_existing_channel():
                    self._import_models()
                    # Inside the atomic block, so a channel carrying a dangling
                    # reference rolls back rather than committing half of itself.
                    connection.check_constraints(
                        table_names=[
                            model._meta.db_table for model in self.content_models
                        ]
                    )
                    import_ran = True
        logger.debug(
            "Channel metadata import successfully completed in {} seconds".format(
                time.time() - start
            )
        )

        return import_ran

    def run_and_annotate(self):
        if self.current_channel:
            old_order = self.current_channel.order
        else:
            old_order = None

        import_ran = self.import_channel_data()

        self.end()

        if import_ran:
            channel = ChannelMetadata.objects.get(id=self.channel_id)
            if old_order is not None:
                channel.order = old_order
            channel.last_updated = local_now()
            channel.partial = self.partial
            try:
                if not channel.root:
                    raise AssertionError
            except ContentNode.DoesNotExist:
                node_id = channel.root_id
                ContentNode.objects.create(
                    id=node_id,
                    title=channel.name,
                    content_id=node_id,
                    channel_id=self.channel_id,
                )

            channel_contentnodes = ContentNode.objects.filter(
                channel_id=self.channel_id
            )
            annotate_label_bitmasks(channel_contentnodes)
            annotate_modality(channel_contentnodes)
            set_channel_ancestors(self.channel_id)
            if not self.partial and self.channel_upgraded:
                update_channel_version_to_assignments(channel)

            channel.save()

            logger.info(
                "Channel {} successfully imported into the database".format(
                    self.channel_id
                )
            )
        return import_ran

    def end(self):
        self._stack.close()


class NoIncludedPresetsChannelImport(ChannelImport):
    """
    Schema mapping for importing content databases published before schema
    VERSION_6, which introduced both the included_presets bitmask and the
    file_size_bigint column. Backfills included_presets from each file's own
    preset, and maps the legacy file_size column to file_size_bigint.
    """

    schema_mapping = {
        ContentNode: {
            "per_row": {
                "tree_id": "available_tree_id",
                "available": "default_to_not_available",
            }
        },
        LocalFile: {
            "per_row": {
                "available": "default_to_not_available",
                "file_size_bigint": "file_size",
            }
        },
        File: {
            "per_row": {"available": "default_to_not_available"},
            "post": ["set_included_presets_from_preset"],
        },
    }

    def set_included_presets_from_preset(self):
        # A single UPDATE mapping each preset to its bit via CASE, so the
        # channel's files are scanned once rather than once per preset.
        File.objects.using(self.destination).filter(
            preset__in=renderable_preset_bits,
            contentnode_id__in=self._destination_nodes()
            .filter(channel_id=self.channel_id)
            .values("id"),
        ).update(
            included_presets=Case(
                *(
                    When(preset=preset, then=Value(bit))
                    for preset, bit in renderable_preset_bits.items()
                )
            )
        )


class NoLearningActivitiesChannelImport(NoIncludedPresetsChannelImport):
    """
    Class defining the schema mapping for importing content databases before learning activities metadata was added
    """

    schema_mapping = {
        **NoIncludedPresetsChannelImport.schema_mapping,
        ContentNode: {
            "per_row": {
                "tree_id": "available_tree_id",
                "available": "default_to_not_available",
            },
            "post": ["set_learning_activities_from_kind"],
        },
    }

    def set_learning_activities_from_kind(self):
        for kind, la in kind_activity_map.items():
            self._destination_nodes().filter(
                kind=kind, channel_id=self.channel_id
            ).update(learning_activities=la)


class NoVersionChannelImport(NoLearningActivitiesChannelImport):
    """
    Class defining the schema mapping for importing old content databases (i.e. ones produced before the
    ChannelImport machinery was implemented). The schema mapping below defines how to bring in information
    from the old version of the Kolibri content databases into the database for the current version of Kolibri.
    """

    schema_mapping = {
        # The top level keys of the schema_mapping are the Content Django Models that are to be imported
        ContentNode: {
            # For each model's mappings, can defined both 'per_row' and 'per_table' mappings.
            "per_row": {
                # The key of the 'per_row' mapping object is the table column that we are populating
                # In the case of Django ForeignKey fields, this will be the field name plus _id
                # The value is a string that refers either to a table column on the source data
                # or a method on this import class that will be passed the row data and should return
                # the mapped value.
                "channel_id": "infer_channel_id_from_source",
                "tree_id": "available_tree_id",
                "available": "get_none",
                "license_name": "get_license_name",
                "license_description": "get_license_description",
            },
            "post": ["set_learning_activities_from_kind"],
        },
        File: {
            "per_row": {
                # If we didn't want to encode the Django _id convention here, we could reference the field
                # attname in order to set it.
                File._meta.get_field("local_file").attname: "checksum",
                "available": "get_none",
            },
            "post": ["set_included_presets_from_preset"],
        },
        LocalFile: {
            # Because LocalFile does not exist on old content databases, we have to override the table that
            # we are drawing from, the generate_local_file_from_file method overrides the default mapping behaviour
            # and instead reads from the File model table
            # It then uses per_row mappers to get the require model fields from the File model to populate our
            # new LocalFiles.
            "per_table": "generate_local_file_from_file",
            "per_row": {
                "id": "checksum",
                "extension": "extension",
                "file_size_bigint": "file_size",
                "available": "get_none",
            },
        },
        ChannelMetadata: {
            "per_row": {
                ChannelMetadata._meta.get_field(
                    "min_schema_version"
                ).attname: "set_version_to_no_version",
                "root_id": "root_pk",
            }
        },
    }

    def infer_channel_id_from_source(self, source_object):
        return self.channel_id

    def generate_local_file_from_file(self, source_table):
        checksum_record = set()
        # LocalFile objects are unique per checksum
        for record in self.base_table_mapper(self._source_table(File)):
            if record["checksum"] not in checksum_record:
                checksum_record.add(record["checksum"])
                yield record

    def set_version_to_no_version(self, source_object):
        return NO_VERSION

    @cached_property
    def _licenses(self):
        """
        The source's licenses by id. These tables hold a handful of rows, so they are
        read once rather than queried per id. Per instance, so that one channel's
        license ids cannot resolve against a previously imported channel's names.
        """
        return {
            record["id"]: record
            for record in self.base_table_mapper(self._source_table(License))
        }

    def get_license(self, source_object):
        license_id = get_attribute(source_object, "license_id", None)
        if not license_id:
            return None
        return self._licenses.get(license_id)

    def get_license_name(self, source_object):
        license = self.get_license(source_object)
        if not license:
            return None
        return license["license_name"]

    def get_license_description(self, source_object):
        license = self.get_license(source_object)
        if not license:
            return None
        # V020BETA1's content_license has no license_description column at all.
        return license.get("license_description")


# Dict that maps from schema versions to ChannelImport classes
# The channel import class defines all the operations required in order to import data
# from a content database with this content schema, into the schema being used by this
# version of Kolibri. When a new schema version is added
mappings = {
    V020BETA1: NoVersionChannelImport,
    V040BETA3: NoVersionChannelImport,
    NO_VERSION: NoVersionChannelImport,
    VERSION_1: NoLearningActivitiesChannelImport,
    VERSION_2: NoLearningActivitiesChannelImport,
    VERSION_3: NoLearningActivitiesChannelImport,
    VERSION_4: NoLearningActivitiesChannelImport,
    VERSION_5: NoIncludedPresetsChannelImport,
    VERSION_6: ChannelImport,
}


class FutureSchemaError(Exception):
    pass


class InvalidSchemaVersionError(Exception):
    pass


def initialize_import_manager(
    channel_metadata,
    source,
    cancel_check=None,
    destination=None,
    partial=False,
    version_requested=False,
    force_upgrade=False,
):
    # For data-based imports the schema is the version the data was serialized at;
    # for file-based imports use the channel's min_schema_version.
    if isinstance(source, dict):
        min_version = source["schema_version"]
    else:
        min_version = channel_metadata.get(
            "min_schema_version",
            channel_metadata.get("inferred_schema_version"),
        )

    try:
        ImportClass = mappings.get(min_version)
    except KeyError:
        try:
            version_number = int(min_version)
            if version_number > int(CONTENT_SCHEMA_VERSION):
                raise FutureSchemaError(
                    "Tried to import schema version, {version}, which is not supported by this version of Kolibri.".format(
                        version=min_version
                    )
                )
            elif version_number < int(CONTENT_SCHEMA_VERSION):
                # If it's a valid integer, but there is no schema for it, then we have stopped supporting this version
                raise InvalidSchemaVersionError(
                    "Tried to import unsupported schema version {version}".format(
                        version=min_version
                    )
                )
        except ValueError:
            raise InvalidSchemaVersionError(
                "Tried to import invalid schema version {version}".format(
                    version=min_version
                )
            )

    return ImportClass(
        channel_metadata["id"],
        source,
        channel_version=channel_metadata["version"],
        cancel_check=cancel_check,
        destination=destination,
        partial=partial,
        version_requested=version_requested,
        force_upgrade=force_upgrade,
    )


def import_channel_from_local_db(
    channel_id, cancel_check=None, contentfolder=None, version_requested=False
):
    source = get_content_database_file_path(channel_id, contentfolder=contentfolder)

    channel_metadata = read_channel_metadata_from_db_file(source)

    with initialize_import_manager(
        channel_metadata,
        source,
        cancel_check=cancel_check,
        version_requested=version_requested,
    ) as import_manager:
        return import_manager.run_and_annotate()


def import_channel_from_data(
    source_data, cancel_check=None, partial=False, force_upgrade=False
):
    channel_metadata = source_data.get(ChannelMetadata._meta.db_table)[0]

    with initialize_import_manager(
        channel_metadata,
        source_data,
        cancel_check=cancel_check,
        partial=partial,
        force_upgrade=force_upgrade,
    ) as import_manager:
        import_ran = import_manager.run_and_annotate()

        return import_ran, import_manager.channel_upgraded


def import_channel_by_id(
    channel_id, cancel_check, contentfolder=None, version_requested=False
):
    try:
        return import_channel_from_local_db(
            channel_id,
            cancel_check=cancel_check,
            contentfolder=contentfolder,
            version_requested=version_requested,
        )
    except InvalidSchemaVersionError:
        raise CommandError(
            "Database file had an invalid database schema, the file may be corrupted or have been modified."
        )
    except FutureSchemaError:
        raise KolibriUpgradeError(
            "Database file uses a future database schema that this version of Kolibri does not support."
        )
