import sentry_sdk
import kolibri

from sentry_sdk.integrations.django import DjangoIntegration
from kolibri.utils import conf
from kolibri.utils.server import installation_type


sentry_sdk.init(
    dsn=conf.OPTIONS["Debug"]["SENTRY_BACKEND_DSN"],
    environment=conf.OPTIONS["Debug"]["SENTRY_ENVIRONMENT"],
    integrations=[DjangoIntegration()],
    release=kolibri.__version__,
)

with sentry_sdk.configure_scope() as scope:
    scope.set_tag("mode", conf.OPTIONS["Deployment"]["RUN_MODE"])
    scope.set_tag("installer", installation_type())

print("Sentry backend error logging is enabled")
