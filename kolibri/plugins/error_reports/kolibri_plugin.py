from magicbus.plugins import SimplePlugin

from kolibri.core.analytics.hooks import PingbackHook
from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.sqlite.hooks import AdditionalSQLiteDatabaseHook
from kolibri.core.tasks.hooks import JobHook
from kolibri.core.tasks.job import State
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.server.hooks import KolibriProcessHook


class ErrorReportsPlugin(KolibriPluginBase):
    """
    A plugin to capture and report errors in Kolibri.
    """

    untranslated_view_urls = "api_urls"


@register_hook
class ErrorReportsPluginAsset(WebpackBundleHook):
    bundle_id = "main"


@register_hook
class ErrorReportsPluginInclusionHook(FrontEndBaseSyncHook):
    bundle_class = ErrorReportsPluginAsset


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


@register_hook
class ErrorReportsPingbackHook(PingbackHook):
    def pingback(self, server, pingback_id):
        # Plugin modules load before Django setup.
        from .tasks import ping_error_reports  # noqa: PLC0415

        ping_error_reports.enqueue(args=(server, pingback_id))


@register_hook
class ErrorReportsPluginJobHook(JobHook):
    def schedule(self, job, orm_job):
        pass

    def update(self, job, orm_job, state=None, **kwargs):
        if state != State.FAILED:
            return
        # Plugin modules load before Django setup.
        from .handlers import handle_task_failure  # noqa: PLC0415
        from .tasks import ping_error_reports  # noqa: PLC0415

        # Don't capture the submission task's own failures: recording one
        # would create a task error report that the next pingback tries to
        # submit, and a persistently failing submission would loop forever.
        if job.func == ping_error_reports.func_string:
            return
        handle_task_failure(job, orm_job)

    def clear(self, job, orm_job):
        pass
