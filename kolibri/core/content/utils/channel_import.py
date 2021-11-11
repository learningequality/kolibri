import io
import json
import logging
import time
from itertools import islice

from django.apps import apps
from django.db.models.fields.related import ForeignKey
from sqlalchemy import or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import select
from sqlalchemy.sql import text

from .channels import read_channel_metadata_from_db_file
from .paths import get_content_database_file_path
from .sqlalchemybridge import Bridge
from .sqlalchemybridge import ClassNotFoundError
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
from kolibri.core.content.legacy_models import License
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import set_channel_ancestors
from kolibri.core.content.utils.search import annotate_label_bitmasks
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

merge_models = [ContentTag, LocalFile, Language]

models_not_to_overwrite = [LocalFile]

models_to_exclude = [
    apps.get_model(CONTENT_APP_NAME, "ChannelMetadata_included_languages")
]


class ImportCancelError(Exception):
    pass


def column_not_auto_integer_pk(column):
    """
    A check for whether a column is an auto incrementing integer used for a primary key.
    """
    return not (
        column.autoincrement == "auto"
        and column.primary_key
        and column.type.python_type is int
    )


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


class ChannelImport(object):
    """
    The ChannelImport class has two functions:

    1) it acts as the default import pattern for importing content databases that have naively compatible version
    with the current version of Kolibri (i.e. no explicit mappings are required to bring data from the content db
    into the main db, as there is a one to one correspondence in table names and column names within tables).

    2) It is also the base class for any more complex import that requires explicit schema mappings from one version
    to another.
    """

    current_model_being_imported = None
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
        channel_version=None,
        cancel_check=None,
        source=None,
        destination=None,
    ):
        self.channel_id = channel_id
        self.channel_version = channel_version

        self.cancel_check = cancel_check

        self.source_db_path = source or get_content_database_file_path(self.channel_id)

        self.source = Bridge(sqlite_file_path=self.source_db_path)

        # Explicitly set the destination schema version to our latest published schema version
        # Not the current schema of the DB, as we do our mapping to the published versions.
        if destination is None:
            # If no destination is set then we are targeting the default database
            self.destination = Bridge(
                schema_version=CONTENT_SCHEMA_VERSION, app_name=CONTENT_APP_NAME
            )
        else:
            # If a destination is set then pass that explicitly. At the moment, this only supports
            # importing to an arbitrary SQLite file path.
            self.destination = Bridge(
                sqlite_file_path=destination,
                schema_version=CONTENT_SCHEMA_VERSION,
                app_name=CONTENT_APP_NAME,
            )

        content_app = apps.get_app_config(CONTENT_APP_NAME)

        # Use this rather than get_models, as it returns a list of all models, including those
        # generated by ManyToMany fields, whereas get_models only returns explicitly defined
        # Model classes
        self.content_models = list(content_app.get_models(include_auto_created=True))
        for blacklisted_model in models_to_exclude:
            if blacklisted_model in self.content_models:
                self.content_models.remove(blacklisted_model)

        self.content_models = topological_sort(self.content_models)

        # Get the next available tree_id in our database
        self.available_tree_id = self.find_unique_tree_id()

        self.default_to_not_available = False

        self.set_blank_text = ""

    def get_none(self, source_object):
        return None

    def get_all_destination_tree_ids(self):
        ContentNodeTable = self.destination.get_table(ContentNode)
        return sorted(
            map(
                lambda x: x[0],
                self.destination.execute(
                    select([ContentNodeTable.c.tree_id]).distinct()
                ).fetchall(),
            )
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

        def mapper(record, column):
            """
            A mapper function for the mappings object
            """
            if column in mappings:
                # If the column name is in our defined mappings object,
                # then we need to try to find an alternate value
                col_map = mappings.get(column)  # Get the string value for the mapping
                if hasattr(record, col_map):
                    # Is this mapping value another column of the table?
                    # If so, return it straight away
                    return getattr(record, col_map)
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

    def base_table_mapper(self, SourceTable):
        # If SourceTable is none, then the source table does not exist in the DB
        if SourceTable is not None:
            return self.source.execute(select([SourceTable])).fetchall()
        return []

    def base_row_mapper(self, record, column):
        # By default just return value directly from the record
        return getattr(record, column, None)

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

    def get_dest_columns(self, DestinationTable):
        # Filter out columns that are auto-incrementing integer primary keys, as these can cause collisions in the
        # database. As all of our content database models use UUID primary keys, the only tables using these
        # primary keys are intermediary tables for ManyToMany fields, and so nothing should be Foreign Keying
        # to these ids.
        # By filtering them here, the database should autoset an incremented id.
        return [
            (column_name, column_obj)
            for column_name, column_obj in DestinationTable.columns.items()
            if column_not_auto_integer_pk(column_obj)
        ]

    def raw_attached_sqlite_table_import(self, model, table_mapper):

        self.check_cancelled()

        source_table = self.source.get_table(model)
        DestinationTable = self.destination.get_table(model)

        # check the schema map and set up any fields to map to constant values
        field_constants = {}
        schema_map = self.schema_mapping.get(model)
        if schema_map:
            for field, mapper in schema_map.get("per_row", {}).items():
                if hasattr(self, mapper):
                    mapattr = getattr(self, mapper)
                    if callable(mapattr):
                        raise Exception(
                            "Can't use SQLITE table import method with callable column mappers"
                        )
                    else:
                        field_constants[field] = mapattr
                else:
                    raise Exception(
                        "Can't use SQLITE table import method with mapping attribute '{}'".format(
                            mapper
                        )
                    )

        # enumerate the columns we're going to be writing into, excluding any we're meant to ignore
        dest_columns = [
            col.name for col_name, col in self.get_dest_columns(DestinationTable)
        ]

        # build a list of values (constants or source table column references) to be inserted
        source_vals = []
        for col in dest_columns:
            if col in field_constants:
                # insert the literal constant value, if we have one
                val = convert_to_sqlite_value(field_constants[col])
            elif col in source_table.columns.keys():
                # pull the value from the column on the source table if it exists
                val = "source." + col
            else:
                # get the default value from the target model and use that, if the source table didn't have the field
                val = convert_to_sqlite_value(model._meta.get_field(col).get_default())
            source_vals.append(val)

        if model in models_not_to_overwrite:
            method = "INSERT OR IGNORE"
        else:
            method = "REPLACE"

        # wrap column names in parentheses in case names are sql keywords (ex. order)
        dest_columns = ["'{}'".format(col) for col in dest_columns]
        # build and execute a raw SQL query to transfer the data in one fell swoop
        query = """{method} INTO {table} ({destcols}) SELECT {sourcevals} FROM sourcedb.{table} AS source""".format(
            method=method,
            table=DestinationTable.name,
            destcols=", ".join(dest_columns),
            sourcevals=", ".join(source_vals),
        )
        self.destination.execute(text(query))

    def get_and_set_column_default(self, column_obj):
        if hasattr(column_obj, "k_memoized_default"):
            default = getattr(column_obj, "k_memoized_default")
        else:
            default = None
            if column_obj.default is not None:
                if column_obj.default.is_scalar:
                    default = column_obj.default.arg
                elif column_obj.default.is_callable:
                    default = column_obj.default.arg(None)
            setattr(column_obj, "k_memoized_default", default)
        return default

    def postgres_table_import(self, model, row_mapper, table_mapper):
        DestinationTable = self.destination.get_table(model)

        # If the source class does not exist (i.e. this table is undefined in the source database)
        # this will raise an error so we set it to None. In this case, a custom table mapper must
        # have been set up to handle the fact that this is None.
        try:
            SourceTable = self.source.get_table(model)
        except ClassNotFoundError:
            SourceTable = None

        columns = self.get_dest_columns(DestinationTable)
        column_names = [column.name for col_name, column in columns]
        merge = model in merge_models
        do_not_overwrite = model in models_not_to_overwrite
        self.check_cancelled()

        raw_connection = self.destination.get_raw_connection()
        cursor = raw_connection.cursor()

        results = table_mapper(SourceTable)

        def generate_data_with_default(record):
            for col_name, column_obj in columns:
                default = self.get_and_set_column_default(column_obj)
                value = row_mapper(record, column_obj.name)
                yield value if value is not None else default

        if not merge:

            separator = "\t"
            data_string_iterator = StringIteratorIO(
                (
                    separator.join(
                        map(
                            clean_csv_value,
                            (datum for datum in generate_data_with_default(record)),
                        )
                    )
                    + "\n"
                    for record in results
                )
            )

            cursor.copy_from(
                data_string_iterator,
                DestinationTable.name,
                sep=separator,
                columns=column_names,
            )
        else:
            # Import here so that we don't need to depend on psycopg2 for Kolibri in general.
            from psycopg2.extras import execute_values

            pk_name = DestinationTable.primary_key.columns.values()[0].name

            i = 0
            results_slice = list(islice(results, i, i + BATCH_SIZE))
            while results_slice:
                insert_statement = insert(DestinationTable)
                if do_not_overwrite:
                    self.destination.execute(
                        insert_statement.values(
                            [
                                tuple(
                                    datum
                                    for datum in generate_data_with_default(record)
                                )
                                for record in results_slice
                            ]
                        ).on_conflict_do_nothing(
                            constraint=DestinationTable.primary_key
                        )
                    )
                else:
                    execute_values(
                        cursor,
                        # We want to overwrite new values that we are inserting here, so we use an ON CONFLICT DO UPDATE here
                        # for the resulting SET statement, we generate a statement for each column we are trying to update
                        "INSERT INTO {table} AS SOURCE ({column_names}) VALUES %s ON CONFLICT ({pk_name}) DO UPDATE SET {set_statement};".format(
                            table=DestinationTable.name,
                            column_names=", ".join(column_names),
                            pk_name=pk_name,
                            set_statement=", ".join(
                                [
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
                                ]
                            ),
                        ),
                        (
                            tuple(datum for datum in generate_data_with_default(record))
                            for record in results_slice
                        ),
                        template="(" + "%s, " * (len(columns) - 1) + "%s)",
                    )
                i += BATCH_SIZE
                results_slice = list(islice(results, i, i + BATCH_SIZE))
        cursor.close()

    def sqlite_insert_data(
        self, data_to_insert, DestinationTable, merge, do_not_overwrite
    ):
        if merge:
            data_to_insert = self.merge_sqlite_records(
                data_to_insert, DestinationTable, do_not_overwrite
            )
        if data_to_insert:
            self.destination.execute(insert(DestinationTable), data_to_insert)

    def sqlite_table_import(self, model, row_mapper, table_mapper):
        DestinationTable = self.destination.get_table(model)

        # If the source class does not exist (i.e. this table is undefined in the source database)
        # this will raise an error so we set it to None. In this case, a custom table mapper must
        # have been set up to handle the fact that this is None.
        try:
            SourceTable = self.source.get_table(model)
        except ClassNotFoundError:
            SourceTable = None

        columns = self.get_dest_columns(DestinationTable)
        merge = model in merge_models
        do_not_overwrite = model in models_not_to_overwrite
        data_to_insert = []
        unflushed_rows = 0
        for record in table_mapper(SourceTable):
            self.check_cancelled()
            data = {}
            for column_name, column in columns:
                value = row_mapper(record, column_name)
                if value is None and not merge:
                    value = self.get_and_set_column_default(column)
                data[column_name] = value
            data_to_insert.append(data)
            unflushed_rows += 1
            if unflushed_rows == BATCH_SIZE:
                self.sqlite_insert_data(
                    data_to_insert, DestinationTable, merge, do_not_overwrite
                )
                data_to_insert = []
                unflushed_rows = 0

        if data_to_insert:
            self.sqlite_insert_data(
                data_to_insert, DestinationTable, merge, do_not_overwrite
            )

    def can_use_sqlite_attach_method(self, model, table_mapper):

        # Check whether we can directly "attach" the sqlite database and do a one-line transfer
        # First check that we are not doing any mapping to construct the tables
        can_use_attach = table_mapper == self.base_table_mapper
        # Now check that the schema mapping doesn't contain anything that we don't know how to handle
        schema_map = self.schema_mapping.get(model)
        if schema_map:
            # Check that the only thing in the schema map is row mappings
            can_use_attach = (
                can_use_attach and len(set(schema_map.keys()) - set(["per_row"])) == 0
            )
            # Check that all the row mappings defined for this table are things we can handle
            for row_mapping in set(schema_map.get("per_row", {}).values()):
                if hasattr(self, row_mapping):
                    if callable(getattr(self, row_mapping)):
                        return False
                else:
                    return False
        # Check that the engine being used is sqlite, and it's been attached
        can_use_attach = can_use_attach and self._sqlite_db_attached
        # Check that the table is in the source database (otherwise we can't use the ATTACH method)
        try:
            self.source.get_table(model)
        except ClassNotFoundError:
            return False

        return can_use_attach

    def table_import(self, model, row_mapper, table_mapper):
        # keep track of which model is currently being imported
        self.current_model_being_imported = model

        if self.destination.engine.name == "postgresql":
            result = self.postgres_table_import(model, row_mapper, table_mapper)
        elif self.can_use_sqlite_attach_method(model, table_mapper):
            result = self.raw_attached_sqlite_table_import(model, table_mapper)
        else:
            result = self.sqlite_table_import(model, row_mapper, table_mapper)

        self.current_model_being_imported = None

        return result

    def merge_sqlite_records(self, data, DestinationTable, do_not_overwrite=False):
        # Models that should be merged (see list above) need to be individually merged
        # as SQL Alchemy ORM does not support INSERT ... ON DUPLICATE KEY UPDATE style queries,
        # as not available in SQLite, only MySQL as far as I can tell:
        # http://hackthology.com/how-to-compile-mysqls-on-duplicate-key-update-in-sql-alchemy.html
        # and ON CONFLICT is only available in SQLite 3.24 and higher, which we cannot be sure of existing.
        pk_column = DestinationTable.primary_key.columns.values()[0]
        columns = self.get_dest_columns(DestinationTable)
        # We don't do any batching inside this method, as we assume it is being called by a method
        # that is already limiting the number of elements that will be passed into this.
        existing_values = {
            v[pk_column.name]: v
            for v in self.destination.execute(
                select([DestinationTable]).where(
                    pk_column.in_(d[pk_column.name] for d in data)
                )
            ).fetchall()
        }
        data_to_return = []
        if do_not_overwrite:
            for d in data:
                if d[pk_column.name] not in existing_values:
                    for column_name, column in columns:
                        value = d.get(column_name)
                        if value is None:
                            value = self.get_and_set_column_default(column)
                        d[column_name] = value
                    data_to_return.append(d)
        else:
            for d in data:
                pk = d[pk_column.name]
                if pk in existing_values:
                    value = dict(existing_values[pk])
                    value.update(d)
                else:
                    value = d
                for column_name, column in columns:
                    if column_name not in value or value[column_name] is None:
                        value[column_name] = self.get_and_set_column_default(column)
                data_to_return.append(value)
        return data_to_return

    def check_and_delete_existing_channel(self):
        ChannelMetadataTable = self.destination.get_table(ChannelMetadata)
        existing_channel = self.destination.execute(
            select([ChannelMetadataTable]).where(
                ChannelMetadataTable.c.id == self.channel_id
            )
        ).fetchone()

        if existing_channel:

            if existing_channel["version"] < self.channel_version:
                # We have an older version of this channel, so let's clean out the old stuff first
                logger.info(
                    (
                        "Older version {channel_version} of channel {channel_id} already exists in database; removing old entries "
                        + "so we can upgrade to version {new_channel_version}"
                    ).format(
                        channel_version=existing_channel["version"],
                        channel_id=self.channel_id,
                        new_channel_version=self.channel_version,
                    )
                )

                ContentNodeTable = self.destination.get_table(ContentNode)

                root_node = self.destination.execute(
                    select([ContentNodeTable]).where(
                        ContentNodeTable.c.id == existing_channel["root_id"]
                    )
                ).fetchone()

                if root_node:
                    self.delete_old_channel_data(root_node["tree_id"])
            else:
                # We have previously loaded this channel, with the same or newer version, so our work here is done
                logger.warn(
                    (
                        "Version {channel_version} of channel {channel_id} already exists in database; cancelling import of "
                        + "version {new_channel_version}"
                    ).format(
                        channel_version=existing_channel["version"],
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

    def delete_old_channel_data(self, old_tree_id):

        # we want to delete all content models, but not "merge models" (ones that might also be used by other channels), and ContentNode last
        models_to_delete = [
            model
            for model in self.content_models
            if model is not ContentNode and model not in merge_models
        ] + [ContentNode]

        ContentNodeTable = self.destination.get_table(ContentNode)

        for model in models_to_delete:
            table = self.destination.get_table(model)
            query = table.delete()

            # we do a few things differently if it's the ContentNode model, vs a model related to ContentNode
            if model is ContentNode:
                query = query.where(ContentNodeTable.c.tree_id == old_tree_id)
            else:
                columns = [
                    f.column
                    for f in model._meta.fields
                    if isinstance(f, ForeignKey) and f.target_field.model is ContentNode
                ]
                # run a query for each field this model has that foreignkeys onto ContentNode
                or_queries = [
                    getattr(table.c, column).in_(
                        select([ContentNodeTable.c.id]).where(
                            ContentNodeTable.c.tree_id == old_tree_id
                        )
                    )
                    for column in columns
                ]
                query = query.where(or_(*or_queries))

            pk_column = table.primary_key.columns.values()[0]
            # if the external database is attached and there are no incompatible schema mappings for a table,
            # and it doesn't use an autoincrementing integer pk
            # we can skip deleting records that will be REPLACED during import, which helps efficiency
            if self._can_use_optimized_pre_deletion(
                model
            ) and column_not_auto_integer_pk(pk_column):
                pk_name = pk_column.name
                query = query.where(
                    text(
                        "NOT {pk_name} IN (SELECT id FROM sourcedb.{table})".format(
                            pk_name=pk_name, table=table.name
                        )
                    )
                )
            # check that the import operation hasn't since been cancelled
            self.check_cancelled()

            # execute the actual query
            self.destination.execute(query)

    def check_cancelled(self):
        if callable(self.cancel_check):
            check = self.cancel_check()
        else:
            check = bool(self.cancel_check)
        if check:
            raise ImportCancelError("Channel import was cancelled")

    def try_attaching_sqlite_database(self):
        # attach the external content database to our primary database so we can directly transfer records en masse
        if self.destination.engine.name == "sqlite":
            try:
                self.destination.execute(
                    text(
                        "ATTACH '{path}' AS 'sourcedb'".format(path=self.source_db_path)
                    )
                )
                self._sqlite_db_attached = True
            except OperationalError:
                # silently ignore if we were unable to attach the database; we'll just fall back to other methods
                pass

    def try_detaching_sqlite_database(self):
        # detach the content database from the primary database so we don't get errors trying to attach it again later
        if self.destination.engine.name == "sqlite":
            try:
                self.destination.execute(text("DETACH 'sourcedb'"))
            except OperationalError:
                # silently ignore if the database was already detached, as then we're good to go
                pass
            self._sqlite_db_attached = False

    def execute_post_operations(self, model, post_operations):
        DestinationTable = self.destination.get_table(model)
        for operation in post_operations:
            try:
                handler = getattr(self, operation)
                handler(DestinationTable)
            except AttributeError:
                raise AttributeError(
                    "Post operation {} specified for model {} but none found on class".format(
                        operation, model
                    )
                )

    def import_channel_data(self):

        logger.debug("Beginning channel metadata import")
        start = time.time()

        import_ran = False

        try:
            self.try_attaching_sqlite_database()
            transaction = self.destination.connection.begin()
            if self.check_and_delete_existing_channel():
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
                import_ran = True

            transaction.commit()
            self.try_detaching_sqlite_database()
        except (SQLAlchemyError, ImportCancelError) as e:
            # Rollback the transaction if any error occurs during the transaction
            transaction.rollback()
            self.try_detaching_sqlite_database()
            logger.debug(
                "Channel metadata import did not complete after {} seconds".format(
                    time.time() - start
                )
            )
            # Reraise the exception to prevent other errors occuring due to the non-completion
            raise e
        logger.debug(
            "Channel metadata import successfully completed in {} seconds".format(
                time.time() - start
            )
        )
        return import_ran

    def end(self):
        self.source.end()
        self.destination.end()


class NoLearningActivitiesChannelImport(ChannelImport):
    """
    Class defining the schema mapping for importing content databases before learning activities metadata was added
    """

    schema_mapping = {
        ContentNode: {
            "per_row": {
                "tree_id": "available_tree_id",
                "available": "default_to_not_available",
            },
            "post": ["set_learning_activities_from_kind"],
        },
        LocalFile: {"per_row": {"available": "default_to_not_available"}},
        File: {"per_row": {"available": "default_to_not_available"}},
    }

    def set_learning_activities_from_kind(self, ContentNodeTable):
        for kind, la in kind_activity_map.items():
            self.destination.execute(
                ContentNodeTable.update()
                .where(ContentNodeTable.c.kind == kind)
                .values(learning_activities=la)
            )


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
            }
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
                "file_size": "file_size",
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

    licenses = {}

    def infer_channel_id_from_source(self, source_object):
        return self.channel_id

    def generate_local_file_from_file(self, SourceTable):
        SourceTable = self.source.get_table(File)
        checksum_record = set()
        # LocalFile objects are unique per checksum
        for record in self.source.execute(select([SourceTable])).fetchall():
            if record.checksum not in checksum_record:
                checksum_record.add(record.checksum)
                yield record
            else:
                continue

    def set_version_to_no_version(self, source_object):
        return NO_VERSION

    def get_license(self, SourceTable):
        license_id = SourceTable.license_id
        if not license_id:
            return None
        if license_id not in self.licenses:
            LicenseTable = self.source.get_table(License)
            license = self.source.execute(
                select([LicenseTable]).where(LicenseTable.c.id == license_id)
            ).fetchone()
            self.licenses[license_id] = license
        return self.licenses[license_id]

    def get_license_name(self, SourceTable):
        license = self.get_license(SourceTable)
        if not license:
            return None
        return license.license_name

    def get_license_description(self, SourceTable):
        license = self.get_license(SourceTable)
        if not license:
            return None
        return license.license_description


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
    VERSION_5: ChannelImport,
}


class FutureSchemaError(Exception):
    pass


class InvalidSchemaVersionError(Exception):
    pass


def initialize_import_manager(
    channel_id, cancel_check=None, source=None, destination=None
):
    channel_metadata = read_channel_metadata_from_db_file(
        source or get_content_database_file_path(channel_id)
    )
    # For old versions of content databases, we can only infer the schema version
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
        channel_id,
        channel_version=channel_metadata["version"],
        cancel_check=cancel_check,
        source=source,
        destination=destination,
    )


def import_channel_from_local_db(channel_id, cancel_check=None):
    import_manager = initialize_import_manager(channel_id, cancel_check=cancel_check)

    import_ran = import_manager.import_channel_data()

    import_manager.end()

    channel = ChannelMetadata.objects.get(id=channel_id)
    channel.last_updated = local_now()
    try:
        if not channel.root:
            raise AssertionError
    except ContentNode.DoesNotExist:
        node_id = channel.root_id
        ContentNode.objects.create(
            id=node_id, title=channel.name, content_id=node_id, channel_id=channel_id
        )

    annotate_label_bitmasks(ContentNode.objects.filter(channel_id=channel_id))
    set_channel_ancestors(channel_id)

    channel.save()

    logger.info("Channel {} successfully imported into the database".format(channel_id))
    return import_ran
