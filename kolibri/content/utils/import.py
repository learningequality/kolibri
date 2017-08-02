from django.conf import settings
from django.db.models import Model
from kolibri.content import models
from kolibri.content.models import ContentNode, File, Language, License, LocalFile
from sqlalchemy import create_engine
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker

from .paths import get_content_database_file_path


def sqlite_connection_string(db_path):
    return 'sqlite:///{db_path}'.format(db_path=db_path)

def make_session(connection_string):
    engine = create_engine(connection_string, echo=False, convert_unicode=True)
    Session = sessionmaker(bind=engine)
    return Session(), engine

def get_default_db_string():
    destination_db = settings.DATABASES.get('default')
    if destination_db['ENGINE'] == 'sqlite':
        return sqlite_connection_string(destination_db['NAME'])
    else:
        return '{dialect}://{user}:{password}@{host}:{port}/{dbname}'.format(
            dialect=destination_db['ENGINE'].split('.')[-1],
            user=destination_db['USER'],
            password=destination_db['PASSWORD'],
            host=destination_db['HOST'],
            port=destination_db['PORT'],
            dbname=destination_db['NAME'],
        )


NO_VERSION = 'unversioned'

table_name_to_model = {
    model._meta.db_table: model for model in models if issubclass(model, Model)
}

# Some tables we want to merge existing data with,
# rather than just adding a new row for every row in the imported db
merge_tables = [
    License._meta.db_table,
    Language._meta.db_table,
    LocalFile._meta.db_table,
]


class ChannelImport(object):

    # Specific instructions and exceptions for importing table from previous versions of Kolibri
    # The value for a particular key can either be a function, which will be invoked on the context
    # Or, as a shortcut, a string can be used that will be used to get a different attribute from the
    # source object
    # Mappings can be 'per_column' affecting a single column on a row, 'per_row', mapping an entire row at a time
    # or 'per_table' mapping an entire table at a time.
    schema_mapping = {}

    def __init__(self, channel_id, source=None, source_engine=None):
        self.channel_id = channel_id
        self.destination, self.dest_engine = make_session(get_default_db_string())
        # Reuse an existing source session and engine if possible
        if not source and not source_engine:
            self.source, self.source_engine = make_session(sqlite_connection_string(get_content_database_file_path(channel_id)))
        else:
            self.source = source
            self.source_engine = source_engine

        self.DestinationBase = automap_base()
        self.DestinationBase.prepare(self.dest_engine, reflect=True)

        self.SourceBase = automap_base()
        self.SourceBase.prepare(self.source_engine, reflect=True)

        # Get the next available tree_id in our database
        self.tree_id = self.find_unique_id()

    def find_unique_tree_id(self):
        tree_ids = sorted(self.destination.query(
            self.DestinationBase.classes[ContentNode._meta.db_table].tree_id).distinct())

        # Do a binary search to find the lowest unused tree_id
        def find_hole_in_list(ids):
            last = len(ids) - 1
            middle = int(last/2 + 1)
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
        if mappings is None:
            mappings = {}

        def mapper(record, column):
            if column in mappings:
                col_map = mappings.get(column)
                if hasattr(record, col_map):
                    return getattr(record, col_map)
                elif hasattr(self, col_map):
                    return getattr(self, col_map)(record)
                else:
                    raise AttributeError('Column mapping specified but no valid column name or method found')
            else:
                return getattr(record, column)
        return mapper

    def base_table_mapper(self, source_table, row_mapper):
        for record in self.source.query(source_table).all():
            yield record

    def generate_table_mapper(self, mapping=None):
        if mapping is None:
            return self.base_table_mapper
        # Can only be a method on the Import object
        if hasattr(self, mapping):
            return getattr(self, mapping)
        raise AttributeError('Table mapping specified but no valid method found')

    def table_import(self, table_name, row_mapper, table_mapper):
        DestinationRecord = self.DestinationBase.classes[table_name]
        SourceRecord = self.SourceBase.classes[table_name]
        dest_table = DestinationRecord.__table__
        source_table = SourceRecord.__table__
        columns = dest_table.columns.keys()
        for record in table_mapper(columns, source_table):
            data = {
                str(column): row_mapper(record, column) for column in columns if row_mapper(record, column)
            }
            self.destination.merge(DestinationRecord(**data))

    def import_channel_data(self):

        table_names = [table for table in self.DestinationBase.classes.keys() if table.startswith('content')]

        for table_name in table_names:
            mapping = self.schema_mapping.get(table_name, {})
            row_mapper = self.generate_row_mapper(mapping.get('per_row'))
            table_mapper = self.generate_table_mapper(mapping.get('per_table'))
            self.table_import(table_name, row_mapper, table_mapper)

    def commit_changes(self):
        self.destination.commit()


class NoVersionChannelImport(ChannelImport):

    schema_mapping = {
        ContentNode._meta.db_table: {
            'per_row': {
                'channel_id': 'infer_channel_id_from_source',
                'tree_id': 'get_tree_id',
            },
        },
        File._meta.db_table: {
            'per_row': {
                File._meta.get_field('local_file').attname: 'checksum',
            },
        },
        LocalFile._meta.db_table: {
            'per_table': 'generate_local_file_from_file',
            'per_row': {
                'checksum': 'id',
                'extension': 'extension',
                'file_size': 'file_size',
            },
        },
    }

    def infer_channel_id_from_source(self, source_object):
        return self.channel_id

    def get_tree_id(self, source_object):
        return self.tree_id

    def generate_local_file_from_file(self, source_table, row_mapper):
        source_table = self.SourceBase.classes[File._meta.db_table].__table__
        for record in self.source.query(source_table).all():
            yield record


mappings = {
    NO_VERSION: NoVersionChannelImport
}


def initialize_import_object(channel_id):

    source, source_engine = make_session(sqlite_connection_string(get_content_database_file_path(channel_id)))

    SourceBase = automap_base()
    SourceBase.prepare(source_engine, reflect=True)

    source_channel_metadata = source.query(SourceBase.classes['content_channelmetadata']).all()[0]

    min_version = source_channel_metadata.get('min_kolibri_version', NO_VERSION)

    ImportClass = mappings.get(min_version)

    return ImportClass(channel_id, source=source, source_engine=source_engine)
