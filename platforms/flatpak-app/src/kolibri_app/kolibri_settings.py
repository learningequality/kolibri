# Django settings module built on a star import.
from kolibri.deployment.default.settings.base import *  # noqa: F403

# TODO: Load SECRET_KEY from a file in $KOLIBRI_HOME

SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = 52560000
