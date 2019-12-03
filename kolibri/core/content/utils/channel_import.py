import logging

from django.apps import apps
from django.db.models.fields.related import ForeignKey
from sqlalchemy.exc import OperationalError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import text

from .channels import read_channel_metadata_from_db_file
from .paths import get_content_database_file_path
from .sqlalchemybridge import Bridge
from .sqlalchemybridge import ClassNotFoundError
from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import NO_VERSION
from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.constants.schema_versions import V040BETA3
from kolibri.core.content.constants.schema_versions import VERSION_1
from kolibri.core.content.constants.schema_versions import VERSION_2
from kolibri.core.content.constants.schema_versions import VERSION_3
from kolibri.core.content.legacy_models import License
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
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
    elif python_value is None:
        return "null"
    else:
        return repr(python_value)


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

        # Get the next available tree_id in our database
        self.available_tree_id = self.find_unique_tree_id()

        self.default_to_not_available = 0

        self.set_blank_text = ""

    def get_none(self, source_object):
        return None

    def get_all_destination_tree_ids(self):
        ContentNodeRecord = self.destination.get_class(ContentNode)
        return sorted(
            map(
                lambda x: x[0],
                self.destination.session.query(ContentNodeRecord.tree_id)
                .distinct()
                .all(),
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
                    else:
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

    def base_table_mapper(self, SourceRecord):
        # If SourceRecord is none, then the source table does not exist in the DB
        if SourceRecord:
            return self.source.session.query(SourceRecord).all()
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

    def raw_attached_sqlite_table_import(
        self, model, row_mapper, table_mapper, unflushed_rows
    ):

        self.check_cancelled()

        source_table = self.source.get_table(model)
        dest_table = self.destination.get_table(model)

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

        # make sure to ignore any auto-incrementing fields so they're regenerated in the destination table
        fields_to_ignore = set(
            [
                colname
                for colname, colobj in dest_table.columns.items()
                if not column_not_auto_integer_pk(colobj)
            ]
        )

        # enumerate the columns we're going to be writing into, excluding any we're meant to ignore
        dest_columns = [
            col.name for col in dest_table.c if col.name not in fields_to_ignore
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
            table=dest_table.name,
            destcols=", ".join(dest_columns),
            sourcevals=", ".join(source_vals),
        )
        self.destination.session.execute(text(query))

        # no need to flush/commit as a result of the transfer in this method
        return 1

    def orm_table_import(self, model, row_mapper, table_mapper, unflushed_rows):
        DestinationRecord = self.destination.get_class(model)
        dest_table = self.destination.get_table(model)

        # If the source class does not exist (i.e. this table is undefined in the source database)
        # this will raise an error so we set it to None. In this case, a custom table mapper must
        # have been set up to handle the fact that this is None.
        try:
            SourceRecord = self.source.get_class(model)
        except ClassNotFoundError:
            SourceRecord = None

        # Filter out columns that are auto-incrementing integer primary keys, as these can cause collisions in the
        # database. As all of our content database models use UUID primary keys, the only tables using these
        # primary keys are intermediary tables for ManyToMany fields, and so nothing should be Foreign Keying
        # to these ids.
        # By filtering them here, the database should autoset an incremented id.
        columns = [
            column_name
            for column_name, column_obj in dest_table.columns.items()
            if column_not_auto_integer_pk(column_obj)
        ]
        data_to_insert = []
        merge = model in merge_models
        do_not_overwrite = model in models_not_to_overwrite
        for record in table_mapper(SourceRecord):
            self.check_cancelled()
            data = {
                str(column): row_mapper(record, column)
                for column in columns
                if row_mapper(record, column) is not None
            }
            if merge:
                self.merge_record(
                    data, model, DestinationRecord, do_not_overwrite=do_not_overwrite
                )
            else:
                data_to_insert.append(data)
            unflushed_rows += 1
            if unflushed_rows == 10000:
                if not merge:
                    self.destination.session.bulk_insert_mappings(
                        DestinationRecord, data_to_insert
                    )
                    data_to_insert = []
                self.destination.session.flush()
                unflushed_rows = 0
        if not merge and data_to_insert:
            self.destination.session.bulk_insert_mappings(
                DestinationRecord, data_to_insert
            )
        return unflushed_rows

    def can_use_sqlite_attach_method(self, model, row_mapper, table_mapper):

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
            self.source.get_class(model)
        except ClassNotFoundError:
            return False

        return can_use_attach

    def table_import(self, model, row_mapper, table_mapper, unflushed_rows):

        # keep track of which model is currently being imported
        self.current_model_being_imported = model

        if self.can_use_sqlite_attach_method(model, row_mapper, table_mapper):
            result = self.raw_attached_sqlite_table_import(
                model, row_mapper, table_mapper, unflushed_rows
            )
        else:
            result = self.orm_table_import(
                model, row_mapper, table_mapper, unflushed_rows
            )

        self.current_model_being_imported = None

        return result

    def merge_record(self, data, model, DestinationRecord, do_not_overwrite=False):
        # Models that should be merged (see list above) need to be individually merged into the session
        # as SQL Alchemy ORM does not support INSERT ... ON DUPLICATE KEY UPDATE style queries,
        # as not available in SQLite, only MySQL as far as I can tell:
        # http://hackthology.com/how-to-compile-mysqls-on-duplicate-key-update-in-sql-alchemy.html
        RowEntry = self.destination.session.query(DestinationRecord).get(
            data[model._meta.pk.name]
        )
        if RowEntry:
            # record already exists, so if we don't want to overwrite, abort here
            if do_not_overwrite:
                return
            for key, value in data.items():
                setattr(RowEntry, key, value)
        else:
            RowEntry = DestinationRecord(**data)
        self.destination.session.merge(RowEntry)

    def check_and_delete_existing_channel(self):
        ChannelMetadataClass = self.destination.get_class(ChannelMetadata)
        existing_channel = self.destination.session.query(ChannelMetadataClass).get(
            self.channel_id
        )

        if existing_channel:

            if existing_channel.version < self.channel_version:
                # We have an older version of this channel, so let's clean out the old stuff first
                logger.info(
                    (
                        "Older version {channel_version} of channel {channel_id} already exists in database; removing old entries "
                        + "so we can upgrade to version {new_channel_version}"
                    ).format(
                        channel_version=existing_channel.version,
                        channel_id=self.channel_id,
                        new_channel_version=self.channel_version,
                    )
                )

                root_node = self.destination.session.query(
                    self.destination.get_class(ContentNode)
                ).get(existing_channel.root_id)

                if root_node:
                    self.delete_old_channel_data(root_node.tree_id)
            else:
                # We have previously loaded this channel, with the same or newer version, so our work here is done
                logger.warn(
                    (
                        "Version {channel_version} of channel {channel_id} already exists in database; cancelling import of "
                        + "version {new_channel_version}"
                    ).format(
                        channel_version=existing_channel.version,
                        channel_id=self.channel_id,
                        new_channel_version=self.channel_version,
                    )
                )
                return False

        return True

    def _can_use_optimized_pre_deletion(self, model):
        # check whether we can skip fully deleting this model, if we'll be using REPLACE on it anyway
        mapping = self.schema_mapping.get(model, {})
        row_mapper = self.generate_row_mapper(mapping.get("per_row"))
        table_mapper = self.generate_table_mapper(mapping.get("per_table"))
        return self.can_use_sqlite_attach_method(model, row_mapper, table_mapper)

    def delete_old_channel_data(self, old_tree_id):

        # construct a template for deleting records for models that foreign key onto ContentNode
        delete_related_template = """
            DELETE FROM {table}
                WHERE {fk_field} IN (
                    SELECT id FROM {cn_table} WHERE tree_id = '{tree_id}'
                )
        """

        # construct a template for deleting the ContentNode records themselves
        delete_contentnode_template = "DELETE FROM {table} WHERE tree_id = '{tree_id}'"

        # we want to delete all content models, but not "merge models" (ones that might also be used by other channels), and ContentNode last
        models_to_delete = [
            model
            for model in self.content_models
            if model is not ContentNode and model not in merge_models
        ] + [ContentNode]

        for model in models_to_delete:

            # we do a few things differently if it's the ContentNode model, vs a model related to ContentNode
            if model is ContentNode:
                template = delete_contentnode_template
                fields = ["id"]
            else:
                template = delete_related_template
                fields = [
                    f.column
                    for f in model._meta.fields
                    if isinstance(f, ForeignKey) and f.target_field.model is ContentNode
                ]

            # if the external database is attached and there are no incompatible schema mappings for a table,
            # we can skip deleting records that will be REPLACED during import, which helps efficiency
            if self._can_use_optimized_pre_deletion(model):
                template += " AND NOT id IN (SELECT id FROM sourcedb.{table})"

            # run a query for each field this model has that foreignkeys onto ContentNode
            for field in fields:

                # construct the actual query by filling in variables
                query = template.format(
                    table=model._meta.db_table,
                    fk_field=field,
                    tree_id=old_tree_id,
                    cn_table=ContentNode._meta.db_table,
                )

                # check that the import operation hasn't since been cancelled
                self.check_cancelled()

                # execute the actual query
                self.destination.session.execute(text(query))

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
                self.destination.session.execute(
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
                self.destination.session.execute(
                    text("DETACH 'sourcedb'".format(path=self.source_db_path))
                )
            except OperationalError:
                # silently ignore if the database was already detached, as then we're good to go
                pass
            self._sqlite_db_attached = False

    def import_channel_data(self):

        unflushed_rows = 0
        import_ran = False

        try:
            self.try_attaching_sqlite_database()
            if self.check_and_delete_existing_channel():
                for model in self.content_models:
                    mapping = self.schema_mapping.get(model, {})
                    row_mapper = self.generate_row_mapper(mapping.get("per_row"))
                    table_mapper = self.generate_table_mapper(mapping.get("per_table"))
                    logger.info("Importing {model} data".format(model=model.__name__))
                    unflushed_rows = self.table_import(
                        model, row_mapper, table_mapper, unflushed_rows
                    )
                import_ran = True
            self.destination.session.commit()
            self.try_detaching_sqlite_database()
        except (SQLAlchemyError, ImportCancelError) as e:
            # Rollback the transaction if any error occurs during the transaction
            self.destination.session.rollback()
            if self.destination.engine.name == "postgresql":
                self.destination.get_raw_connection().rollback()
            self.try_detaching_sqlite_database()
            # Reraise the exception to prevent other errors occuring due to the non-completion
            raise e
        return import_ran

    def end(self):
        self.source.end()
        self.destination.end()


class NoVersionChannelImport(ChannelImport):
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
            }
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

    def generate_local_file_from_file(self, SourceRecord):
        SourceRecord = self.source.get_class(File)
        checksum_record = set()
        # LocalFile objects are unique per checksum
        for record in self.source.session.query(SourceRecord).all():
            if record.checksum not in checksum_record:
                checksum_record.add(record.checksum)
                yield record
            else:
                continue

    def set_version_to_no_version(self, source_object):
        return NO_VERSION

    def get_license(self, SourceRecord):
        license_id = SourceRecord.license_id
        if not license_id:
            return None
        if license_id not in self.licenses:
            LicenseRecord = self.source.get_class(License)
            license = self.source.session.query(LicenseRecord).get(license_id)
            self.licenses[license_id] = license
        return self.licenses[license_id]

    def get_license_name(self, SourceRecord):
        license = self.get_license(SourceRecord)
        if not license:
            return None
        return license.license_name

    def get_license_description(self, SourceRecord):
        license = self.get_license(SourceRecord)
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
    VERSION_1: ChannelImport,
    VERSION_2: ChannelImport,
    VERSION_3: ChannelImport,
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
    min_version = getattr(
        channel_metadata,
        "min_schema_version",
        getattr(channel_metadata, "inferred_schema_version"),
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
        channel_version=channel_metadata.version,
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
        assert channel.root
    except ContentNode.DoesNotExist:
        node_id = channel.root_id
        ContentNode.objects.create(
            id=node_id, title=channel.name, content_id=node_id, channel_id=channel_id
        )
    channel.save()

    logger.info("Channel {} successfully imported into the database".format(channel_id))
    return import_ran
