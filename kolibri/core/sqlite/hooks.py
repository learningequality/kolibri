from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class AdditionalSQLiteDatabaseHook(KolibriHook):
    """
    A hook to allow plugins to register an additional SQLite database
    in which the specified models will be stored.

    This is only applied when the default database engine is SQLite -
    under other database engines, the models will be stored in the
    default database, mirroring the behaviour of the additional SQLite
    databases that are defined in
    kolibri.deployment.default.sqlite_db_names.

    Note: because these hooks are instantiated before Django has been
    initialized, the hook module must not import any Django models at
    module level - the models property should defer the import until it
    is accessed.
    """

    @property
    def database_name(self):
        """
        The alias for the database, also used as the base name for the
        SQLite file: <database_name>.sqlite3
        Generated from the module path of the plugin that registered the
        hook, so that it cannot collide with databases registered by
        other plugins.
        """
        return self._module_path

    @property
    @abstractmethod
    def models(self):
        """
        An iterable of the model classes that are stored in this database.
        Implement as a property that imports the models when accessed, as
        this hook will be instantiated before Django has been initialized.
        """

    @classmethod
    def database_names(cls):
        return tuple(hook.database_name for hook in cls.registered_hooks)


class AdditionalSQLiteDatabaseRouter(object):
    """
    Routes database calls for any models that have been registered by an
    AdditionalSQLiteDatabaseHook to that hook's database.
    """

    def __init__(self):
        self._model_map = None

    @property
    def model_map(self):
        if self._model_map is None:
            self._model_map = {
                (model._meta.app_label, model._meta.model_name): hook.database_name
                for hook in AdditionalSQLiteDatabaseHook.registered_hooks
                for model in hook.models
            }
        return self._model_map

    def _db_for_model(self, model):
        return self.model_map.get((model._meta.app_label, model._meta.model_name))

    def db_for_read(self, model, **hints):
        return self._db_for_model(model)

    def db_for_write(self, model, **hints):
        return self._db_for_model(model)

    def allow_relation(self, obj1, obj2, **hints):
        db1 = self._db_for_model(obj1.__class__)
        db2 = self._db_for_model(obj2.__class__)
        if db1 is None and db2 is None:
            return None
        return db1 == db2

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        target_db = self.model_map.get((app_label, model_name))
        if target_db is not None:
            return db == target_db
        if db in AdditionalSQLiteDatabaseHook.database_names():
            return False
        return None
