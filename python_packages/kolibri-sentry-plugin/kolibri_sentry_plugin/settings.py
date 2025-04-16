import kolibri
import sentry_sdk
from kolibri.utils import conf
from kolibri.utils.server import installation_type
from sentry_sdk.integrations.django import DjangoIntegration


sentry_sdk.init(
    dsn=conf.OPTIONS["Debug"]["SENTRY_BACKEND_DSN"],
    environment=conf.OPTIONS["Debug"]["SENTRY_ENVIRONMENT"],
    integrations=[DjangoIntegration()],
    release=kolibri.__version__,
)

with sentry_sdk.configure_scope() as scope:
    scope.set_tag("mode", conf.OPTIONS["Deployment"]["RUN_MODE"])
    scope.set_tag("installer", installation_type())


# Copy of the Kolibri default src directive plus sentry.io for sending error reports.
CSP_CONNECT_SRC = ("'self'", "data:", "blob:", "*.sentry.io") + tuple(
    conf.OPTIONS["Deployment"]["CSP_HOST_SOURCES"]
)
