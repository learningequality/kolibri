class SessionDBRouter(object):
    """A router that proxies Session objects to a separate DB."""

    def _get_db(self, model, **hints):

        from django.contrib.sessions.models import Session

        # if the model does not inherit from Session
        if not issubclass(model, Session):
            return None

        return 'session'

    def db_for_read(self, model, **hints):
        return self._get_db(model, **hints)

    def db_for_write(self, model, **hints):
        return self._get_db(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):

        if db == 'session' and model_name == 'session':
            return True
        return False
