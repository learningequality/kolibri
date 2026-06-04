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
        # Importing here to avoid importing models at the top level
        from .models import ErrorReport
        from .models import ServerRun

        return [ErrorReport, ServerRun]


class ServerRunPlugin(SimplePlugin):
    def START(self):
        # Importing here to avoid importing models at the top level
        from .models import ServerRun

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
