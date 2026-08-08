"""
This is a dummy Django app for the entire purpose of generating content
schemas for import operations. This should not be enabled in production.

`generate_schema` also freezes each version's schema here — a column map under
`columns/`, a SQLite DDL dump under `schema_ddl/` — so reading one needs neither
this app installed nor a database to reflect.
"""

import os

default_app_config = "kolibri.core.content.contentschema.apps.ContentSchemaConfig"


def schema_ddl_path(version):
    return os.path.join(os.path.dirname(__file__), "schema_ddl", version + ".sql")
