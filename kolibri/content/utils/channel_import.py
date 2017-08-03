from django.conf import settings
from django.db.models import Model
from kolibri.content.models import AssessmentMetaData, ChannelMetadata, ContentNode, ContentTag, File, Language, License, LocalFile
from sqlalchemy import ColumnDefault, create_engine
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
    if 'sqlite' in destination_db['ENGINE']:
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


models = [
    AssessmentMetaData, ChannelMetadata, ContentNode, ContentTag, File, Language, License, LocalFile
]

table_name_to_model = {
    model._meta.db_table: model for model in models if issubclass(model, Model)
}


NO_VERSION = 'unversioned'

class ChannelImport(object):

    # Specific instructions and exceptions for importing table from previous versions of Kolibri
    # The value for a particular key can either be a function, which will be invoked on the context
    # Or, as a shortcut, a string can be used that will be used to get a different attribute from the
    # source object
    # Mappings can be 'per_row', specifying mappings for an entire row
    # and 'per_table' mapping an entire table at a time. Both can be used simultaneously.
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
        self.tree_id = self.find_unique_tree_id()

        self.content_table_names = [
            table for table in self.DestinationBase.classes.keys() if table.startswith('content')
        ]

        self.set_all_dest_class_defaults()

    def get_dest_record(self, DjangoModel):
        return self.DestinationBase.classes[DjangoModel._meta.db_table]

    def _set_class_defaults(self, table_name):

        BaseClass = self.DestinationBase.classes[table_name]
        try:
            DjangoModel = table_name_to_model[table_name]

            for field in DjangoModel._meta.fields:
                if field.has_default():
                    column = BaseClass.__table__.columns.get(field.attname)
                    default = ColumnDefault(field.default)
                    column.default = default
                    default._set_parent_with_dispatch(column)
        except KeyError:
            # Not all tables have a Django model, as some are ManyToMany intermediary tables
            pass

    def set_all_dest_class_defaults(self):
        for table_name in self.content_table_names:
            self._set_class_defaults(table_name)

    def find_unique_tree_id(self):
        ContentNodeRecord = self.get_dest_record(ContentNode)
        tree_ids = sorted(map(lambda x: x[0], self.destination.query(
            ContentNodeRecord.tree_id).distinct().all()))
        # If there are no pre-existing tree_ids just escape here and return 1
        if not tree_ids:
            return 1
        if len(tree_ids) == 1:
            return tree_ids[0] + 1

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
                return getattr(record, column, None)
        return mapper

    def base_table_mapper(self, SourceRecord):
        for record in self.source.query(SourceRecord).all():
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
        dest_table = DestinationRecord.__table__

        try:
            SourceRecord = self.SourceBase.classes[table_name]
        except KeyError:
            # Sometimes a corresponding source table may not exist
            SourceRecord = None

        columns = dest_table.columns.keys()
        for record in table_mapper(SourceRecord):
            data = {
                str(column): row_mapper(record, column) for column in columns if row_mapper(record, column) is not None
            }
            self.destination.merge(DestinationRecord(**data))

    def import_channel_data(self):

        for table_name in self.content_table_names:
            mapping = self.schema_mapping.get(table_name_to_model.get(table_name), {})
            row_mapper = self.generate_row_mapper(mapping.get('per_row'))
            table_mapper = self.generate_table_mapper(mapping.get('per_table'))
            self.table_import(table_name, row_mapper, table_mapper)

    def delete_content_tree_and_files(self):
        # Use Django ORM to ensure cascading delete:
        ContentNode.objects.filter(channel_id=self.channel_id).delete()

    def commit_changes(self):
        self.destination.commit()


class NoVersionChannelImport(ChannelImport):

    schema_mapping = {
        ContentNode: {
            'per_row': {
                'channel_id': 'infer_channel_id_from_source',
                'tree_id': 'get_tree_id',
            },
        },
        File: {
            'per_row': {
                File._meta.get_field('local_file').attname: 'checksum',
            },
        },
        LocalFile: {
            'per_table': 'generate_local_file_from_file',
            'per_row': {
                'checksum': 'id',
                'extension': 'extension',
                'file_size': 'file_size',
                'available': 'none',
            },
        },
        ChannelMetadata: {
            'per_row': {
                ChannelMetadata._meta.get_field('min_kolibri_version').attname: 'set_version_to_no_version',
            },
        },
    }

    def none(self, source_object):
        return None

    def infer_channel_id_from_source(self, source_object):
        return self.channel_id

    def get_tree_id(self, source_object):
        return self.tree_id

    def generate_local_file_from_file(self, SourceRecord):
        SourceRecord = self.SourceBase.classes[File._meta.db_table]
        for record in self.source.query(SourceRecord).all():
            yield record

    def set_version_to_no_version(self, source_object):
        return NO_VERSION


mappings = {
    NO_VERSION: NoVersionChannelImport
}


def initialize_import_manager(channel_id):

    source, source_engine = make_session(sqlite_connection_string(get_content_database_file_path(channel_id)))

    SourceBase = automap_base()
    SourceBase.prepare(source_engine, reflect=True)

    source_channel_metadata = source.query(SourceBase.classes['content_channelmetadata']).all()[0]

    min_version = getattr(source_channel_metadata, 'min_kolibri_version', NO_VERSION)

    ImportClass = mappings.get(min_version)

    return ImportClass(channel_id, source=source, source_engine=source_engine)


def import_channel_from_local_db(channel_id):
    import_manager = initialize_import_manager(channel_id)

    if ChannelMetadata.objects.filter(id=channel_id).exists():
        # We have already imported this channel in some way, so let's clean up first.
        import_manager.delete_content_tree_and_files()

    import_manager.import_channel_data()

    import_manager.commit_changes()
