import json
import os
import shutil
from collections import defaultdict
from collections import OrderedDict

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connections

from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.contentschema.generate import freeze_schema_version
from kolibri.core.content.utils.channel_import import no_schema_models

DATA_PATH_TEMPLATE = os.path.join(
    os.path.dirname(__file__), "../../fixtures/{name}_content_data.json"
)


class Command(BaseCommand):
    """
    This management command freezes the content database app's schema for a new export
    schema version.
    It should be run when the Content Models schema is updated, and if it is a change between released
    versions the CONTENT_DB_SCHEMA version should have been incremented.
    It also produces a data dump of the content test fixture that fits to this database schema,
    so that we can use it for testing purposes.
    """

    def add_arguments(self, parser):
        parser.add_argument("version", type=str, nargs="?")

    def handle(self, *args, **options):
        version = options["version"]

        if not version:
            version = str(int(CONTENT_SCHEMA_VERSION) + 1)

        app_name = KolibriContentConfig.label

        settings.DATABASES["default"] = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
        # Force a reload of the default connection after changing settings.
        del connections["default"]

        settings.INSTALLED_APPS = ("kolibri.core.content.contentschema",)
        apps.app_configs = OrderedDict()
        apps.apps_ready = apps.models_ready = apps.loading = apps.ready = False
        apps.all_models = defaultdict(OrderedDict)
        apps.clear_cache()
        apps.populate(settings.INSTALLED_APPS)
        call_command("makemigrations", app_name, interactive=False)

        call_command("migrate", app_name)

        app_config = apps.get_app_config(app_name)
        # Exclude channelmetadatacache in case we are reflecting an older version of Kolibri
        table_names = [
            model._meta.db_table
            for name, model in app_config.models.items()
            if name != "channelmetadatacache" and model not in no_schema_models
        ]

        connection = connections["default"]

        table_columns = freeze_schema_version(version, connection, table_names)

        # Load fixture data into the test database with Django
        call_command("loaddata", "content_import_test.json")

        data = {}

        with connection.cursor() as cursor:
            for table_name in table_names:
                cursor.execute('SELECT * FROM "{}"'.format(table_name))
                data[table_name] = [
                    dict(zip(table_columns[table_name], row))
                    for row in cursor.fetchall()
                ]

        data_path = DATA_PATH_TEMPLATE.format(name=version)
        with open(data_path, mode="w", encoding="utf-8") as f:
            json.dump(data, f)

        shutil.rmtree(
            os.path.join(os.path.dirname(__file__), "../../contentschema/migrations")
        )
