"""
Utilidades para sincronizar cambios de esquema entre SQLAlchemy y Django.

Este módulo contiene funciones helper para aplicar cambios de esquema
a las tablas de jobs usando tanto SQLAlchemy como migraciones Django.
"""
import logging

from django.core.management import call_command

from kolibri.deployment.default.sqlite_db_names import JOB_STORAGE
from kolibri.utils import conf


logger = logging.getLogger(__name__)


def _get_migration_database():
    database_engine = conf.OPTIONS["Database"]["DATABASE_ENGINE"]

    if database_engine == "sqlite":
        return JOB_STORAGE
    else:
        return None


def sync_initial_migration_state():
    """
    Syncs the initial migration state without executing SQL.
    This is useful to prevent the initial table creation migration if a jobs
    table was already created via SQLAlchemy.
    """
    try:
        call_command(
            "migrate",
            "kolibritasks",
            "0001",
            "--fake",
            database=_get_migration_database(),
        )
    except Exception as e:
        logger.error(f"Error syncing initial migration state: {e}")
        raise


def sync_django_migration_state():
    """
    Syncs the Django migration state without executing SQL.
    This is useful to mark all migrations as applied if the tables
    were already created via SQLAlchemy.
    """
    try:
        # Ejecutar fake migrate para marcar como aplicada
        call_command(
            "migrate", "kolibritasks", "--fake", database=_get_migration_database()
        )

    except Exception as e:
        logger.error(f"Error syncing Django migration state: {e}")
        raise
