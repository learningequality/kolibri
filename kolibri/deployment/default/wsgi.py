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

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base")

try:
    application = get_wsgi_application()
except OperationalError:  # It happens when sqlite vacuum is being executed. The db is locked
    time.sleep(60)  # vacuum should not take longer than 1 minute
    application = get_wsgi_application()  # try again one last time
