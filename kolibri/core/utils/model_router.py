from abc import ABC
from abc import abstractmethod


class KolibriModelRouter(ABC):
    """
    Determine how to route database calls for a model.
    All other models will be routed to the default database.
    """

    HINT_KEY = None

    @property
    @abstractmethod
    def MODEL_CLASSES(self):
        pass

    @property
    @abstractmethod
    def DB_NAME(self):
        pass

    def db_for_read(self, model, **hints):
        """Send all read operations on the self.MODEL_CLASSES models to self.DB_NAME."""
        if model in self.MODEL_CLASSES:
            return self.DB_NAME
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on the self.MODEL_CLASSES models to self.DB_NAME."""
        if model in self.MODEL_CLASSES:
            return self.DB_NAME
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""

        # Allow any relation between self.MODEL_CLASSES and self.MODEL_CLASSES.
        if (
            obj1._meta.model in self.MODEL_CLASSES
            and obj2._meta.model in self.MODEL_CLASSES
        ):
            return True
        # No opinion if neither object is ain self.MODEL_CLASSES.
        elif (
            obj1._meta.model not in self.MODEL_CLASSES
            and obj2._meta.model not in self.MODEL_CLASSES
        ):
            return None

        # Block relationship if one object is in self.MODEL_CLASSES model and the other isn't.
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the self.MODEL_CLASSES models get created on the right database."""
        if self.HINT_KEY is not None and hints.get(self.HINT_KEY):
            return db == self.DB_NAME
        if any(
            app_label == m._meta.app_label and model_name == m._meta.model_name
            for m in self.MODEL_CLASSES
        ):
            # The self.MODEL_CLASSES model should be migrated only on the self.DB_NAME database.
            return db == self.DB_NAME
        elif db == self.DB_NAME:
            # Ensure that all other apps don't get migrated on the self.DB_NAME database.
            return False

        # No opinion for all other scenarios
        return None
