from django.apps import apps
from django.conf import settings
from sqlalchemy import ColumnDefault, create_engine
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker


def sqlite_connection_string(db_path):
    return 'sqlite:///{db_path}'.format(db_path=db_path)

def make_session(connection_string):
    engine = create_engine(connection_string, echo=False, convert_unicode=True)
    Session = sessionmaker(bind=engine, autoflush=False)
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

class ClassNotFoundError(Exception):
    pass

class Bridge(object):

    def __init__(self, sqlite_file_path=None):
        if sqlite_file_path is None:
            self.connection_string = get_default_db_string()
        else:
            self.connection_string = sqlite_connection_string(sqlite_file_path)
        self.session, self.engine = make_session(self.connection_string)

        self.Base = automap_base()
        # TODO map relationship backreferences using the django names
        self.Base.prepare(self.engine, reflect=True)

        self.set_all_class_defaults()

    def _set_class_defaults(self, DjangoModel):

        try:
            BaseClass = self.get_class(DjangoModel)
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

    def set_all_class_defaults(self):
        for model in apps.get_models():
            self._set_class_defaults(model)

    def get_class(self, DjangoModel):
        try:
            return self.Base.classes[DjangoModel._meta.db_table]
        except KeyError:
            raise ClassNotFoundError('No SQL Alchemy ORM Mapping for this Django model found in this database')

    def end(self):
        # Clean up session and engine to be cautious
        self.session.close()
        self.engine.dispose()
