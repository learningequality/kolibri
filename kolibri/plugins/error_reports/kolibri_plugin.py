import logging

from magicbus.plugins import SimplePlugin

from kolibri.core.sqlite.hooks import AdditionalSQLiteDatabaseHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.server.hooks import KolibriProcessHook

logger = logging.getLogger(__name__)

# Plugin modules load before Django setup, so the imports of this plugin's
# models, tasks and handlers below are deferred into the hooks.


class ErrorReportsPlugin(KolibriPluginBase):
    """
    A plugin to capture and report errors in Kolibri.
    """


@register_hook
class ErrorReportsDatabaseHook(AdditionalSQLiteDatabaseHook):
    @property
    def models(self):
        from .models import ErrorReport  # noqa: PLC0415
        from .models import ErrorReportSubmission  # noqa: PLC0415
        from .models import ServerRun  # noqa: PLC0415

        return [ErrorReport, ErrorReportSubmission, ServerRun]


class ServerRunPlugin(SimplePlugin):
    def START(self):
        # magicbus enters its error state if a START listener raises, and
        # Kolibri does not start.
        try:
            from .models import ServerRun  # noqa: PLC0415

            ServerRun.start_new_run()
        except Exception:
            logger.exception("Error occurred while recording the server run.")

    # Record the run before other START listeners (default priority 50),
    # particularly before task workers start, so that any task failing
    # immediately at startup anchors to this run rather than a previous one.
    START.priority = 10


@register_hook
class ErrorReportsProcessHook(KolibriProcessHook):
    """
    Records a new ServerRun at each server start, to anchor error report
    occurrence times to the run.
    """

    MagicBusPluginClass = ServerRunPlugin
