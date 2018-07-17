import io
import json
import os
import pickle
import sys

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand
from sqlalchemy import create_engine
from sqlalchemy import MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker

from kolibri.core.content.utils.sqlalchemybridge import get_default_db_string
from kolibri.core.content.utils.sqlalchemybridge import SCHEMA_PATH_TEMPLATE

DATA_PATH_TEMPLATE = os.path.join(os.path.dirname(__file__), '../../fixtures/{name}_content_data.json')


class Command(BaseCommand):
    """
    This management command produces SQLAlchemy schema reflections of the content database app.
    It should be run when the Content Models schema is updated, and if it is a change between released
    versions the CONTENT_DB_SCHEMA version should have been incremented.
    It also produces a data dump of the content test fixture that fits to this database schema,
    so that we can use it for testing purposes.

    Note: this command requires an empty, but migrated, database to work properly.
    """

    def add_arguments(self, parser):
        parser.add_argument('version', type=str)

    def handle(self, *args, **options):

        engine = create_engine(get_default_db_string(), convert_unicode=True)

        metadata = MetaData()

        app_config = apps.get_app_config('content')
        # Exclude channelmetadatacache in case we are reflecting an older version of Kolibri
        table_names = [model._meta.db_table for name, model in app_config.models.items() if name != 'channelmetadatacache']
        metadata.reflect(bind=engine, only=table_names)
        Base = automap_base(metadata=metadata)
        # TODO map relationship backreferences using the django names
        Base.prepare()
        session = sessionmaker(bind=engine, autoflush=False)()

        # Load fixture data into the test database with Django
        call_command('loaddata', 'content_import_test.json', interactive=False)

        def get_dict(item):
            value = {key: value for key, value in item.__dict__.items() if key != '_sa_instance_state'}
            return value

        data = {}

        for table_name, record in Base.classes.items():
            data[table_name] = [get_dict(r) for r in session.query(record).all()]

        with open(SCHEMA_PATH_TEMPLATE.format(name=options['version']), 'wb') as f:
            pickle.dump(metadata, f, protocol=2)

        data_path = DATA_PATH_TEMPLATE.format(name=options['version'])
        # Handle Python 2 unicode issue by opening the file in binary mode
        # with no encoding as the data has already been encoded
        if sys.version[0] == '2':
            with io.open(data_path, mode='wb') as f:
                json.dump(data, f)
        else:
            with io.open(data_path, mode='w', encoding='utf-8') as f:
                json.dump(data, f)
