from magicbus.plugins import SimplePlugin

from kolibri.core.sqlite.hooks import AdditionalSQLiteDatabaseHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.server.hooks import KolibriProcessHook


class ErrorReportsPlugin(KolibriPluginBase):
    """
    A plugin to capture and report errors in Kolibri.
    """


@register_hook
class ErrorReportsDatabaseHook(AdditionalSQLiteDatabaseHook):
    @property
    def models(self):
        # Plugin modules load before Django setup.
        from .models import ErrorReport  # noqa: PLC0415
        from .models import ErrorReportSubmission  # noqa: PLC0415
        from .models import ServerRun  # noqa: PLC0415

        return [ErrorReport, ErrorReportSubmission, ServerRun]


class ServerRunPlugin(SimplePlugin):
    def START(self):
        # Plugin modules load before Django setup.
        from .models import ServerRun  # noqa: PLC0415

        ServerRun.start_new_run()

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
