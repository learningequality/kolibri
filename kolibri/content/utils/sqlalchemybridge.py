from django.apps import apps
from django.conf import settings
from sqlalchemy import ColumnDefault, MetaData, create_engine
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker

ENGINES_CACHES = {}
BASE_CLASSES_CACHE = {}

class ClassNotFoundError(Exception):
    pass

def sqlite_connection_string(db_path):
    return 'sqlite:///{db_path}'.format(db_path=db_path)

def get_engine(connection_string):
    if connection_string not in ENGINES_CACHES:
        engine = create_engine(connection_string, echo=settings.DEBUG, convert_unicode=True)
        ENGINES_CACHES[connection_string] = engine
    return ENGINES_CACHES[connection_string]

def make_session(connection_string):
    engine = get_engine(connection_string)
    Session = sessionmaker(bind=engine, autoflush=False)
    return Session(), engine

def get_class(DjangoModel, Base):
    try:
        return Base.classes[DjangoModel._meta.db_table]
    except KeyError:
        raise ClassNotFoundError('No SQL Alchemy ORM Mapping for this Django model found in this database')

def set_all_class_defaults(Base):
    for DjangoModel in apps.get_models():
        try:
            BaseClass = get_class(DjangoModel, Base)
            for field in DjangoModel._meta.fields:
                if field.has_default():
                    column = BaseClass.__table__.columns.get(field.attname)
                    # If there are schema differences between the Django model and the particular table
                    # that we are looking at (even though it has the same table name), then the column
                    # with a default value may not exist
                    if column is not None:
                        default = ColumnDefault(field.default)
                        column.default = default
                        default._set_parent_with_dispatch(column)
        except ClassNotFoundError:
            pass


def get_base(connection_string, engine, app_name=None):
    cache_key = '{connection}_{app_name}'.format(connection=connection_string, app_name=(app_name or 'all'))
    if cache_key not in BASE_CLASSES_CACHE:
        metadata = MetaData()
        if app_name is not None:
            app_config = apps.get_app_config(app_name)
            table_names = [model._meta.db_table for model in app_config.models.values()]
            metadata.reflect(engine, only=table_names)
        else:
            metadata.reflect(engine)
        Base = automap_base(metadata=metadata)
        # TODO map relationship backreferences using the django names
        Base.prepare()
        set_all_class_defaults(Base)
        BASE_CLASSES_CACHE[cache_key] = Base
    return BASE_CLASSES_CACHE[cache_key]


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

class Bridge(object):

    def __init__(self, sqlite_file_path=None, app_name=None):
        if sqlite_file_path is None:
            self.connection_string = get_default_db_string()
        else:
            self.connection_string = sqlite_connection_string(sqlite_file_path)
        self.session, self.engine = make_session(self.connection_string)

        self.Base = get_base(self.connection_string, self.engine, app_name=app_name)

    def get_class(self, DjangoModel):
        return get_class(DjangoModel, self.Base)

    def end(self):
        # Clean up session and engine to be cautious
        self.session.close()
        self.engine.dispose()
