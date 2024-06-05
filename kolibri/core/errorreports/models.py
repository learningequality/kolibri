from kolibri.deployment.default.sqlite_db_names import ERROR_REPORTS


class ErrorReportsRouter(object):
    """
    Determine how to route database calls for the ErrorReports app.
    ref: https://docs.djangoproject.com/en/5.0/topics/db/multi-db/

    """

    def db_for_read(self, model, **hints):
        if model._meta.app_label == "errorreports":
            return ERROR_REPORTS
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == "errorreports":
            return ERROR_REPORTS
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if (
            obj1._meta.app_label == "errorreports"
            and obj2._meta.app_label == "errorreports"
        ):
            return True
        elif "errorreports" not in [obj1._meta.app_label, obj2._meta.app_label]:
            return None

        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == "errorreports":
            return db == ERROR_REPORTS
        elif db == ERROR_REPORTS:
            return False

        return None
