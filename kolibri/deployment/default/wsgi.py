"""
WSGI config for kolibri project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/howto/deployment/wsgi/
"""
import os
import time

from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.db.utils import OperationalError

from kolibri.core.content.utils import paths
from kolibri.utils import conf
from kolibri.utils.kolibri_whitenoise import DynamicWhiteNoise

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)


def generate_wsgi_application():
    django_application = get_wsgi_application()
    base_content_path = "/" + paths.get_content_url(
        conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"]
    ).lstrip("/")
    content_dirs = [paths.get_content_dir_path()] + paths.get_content_fallback_paths()

    # Mount static files
    return DynamicWhiteNoise(
        django_application,
        static_prefix=settings.STATIC_URL,
        dynamic_locations=[
            (base_content_path, content_dir) for content_dir in content_dirs
        ]
        + [(settings.MEDIA_URL, settings.MEDIA_ROOT)],
    )


application = None
tries_remaining = 6
interval = 10
while not application and tries_remaining:
    try:
        application = generate_wsgi_application()
    except OperationalError:
        # An OperationalError happens when sqlite vacuum is being
        # executed. the db is locked
        print(
            "Database assumed to be undergoing a VACUUM, retrying again in {} seconds...".format(
                interval
            )
        )
        tries_remaining -= 1
        time.sleep(interval)

if not application:
    print(
        "Could not start Kolibri with {} retries. Trying one last time".format(
            tries_remaining
        )
    )
    application = generate_wsgi_application()
