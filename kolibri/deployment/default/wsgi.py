"""
WSGI config for kolibri project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/howto/deployment/wsgi/
"""
import os
import time

from django.core.wsgi import get_wsgi_application
from django.db.utils import OperationalError

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)

application = None
tries_remaining = 6
interval = 10
while not application and tries_remaining:
    try:
        application = get_wsgi_application()
    except OperationalError:
        # an OperationalError happens when sqlite vacuum is being executed. the db is locked
        tries_remaining -= 1
        time.sleep(interval)
        application = get_wsgi_application()  # try again one last time
if not application:
    print("Could not start Kolibri")
