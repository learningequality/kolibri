import logging

from django.db import transaction
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

logger = logging.getLogger(__name__)

# Plugin modules load before Django setup, so the imports of this plugin's
# models, tasks and handlers below are deferred into the hooks.


class ErrorReportsPlugin(KolibriPluginBase):
    """
    A plugin to capture and report errors in Kolibri.
    """

    untranslated_view_urls = "api_urls"
    kolibri_options = "options"


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


@register_hook
class ErrorReportsPingbackHook(PingbackHook):
    def pingback(self, server, pingback_id):
        from .tasks import ping_error_reports  # noqa: PLC0415

        ping_error_reports.enqueue(args=(server, pingback_id))


@register_hook
class ErrorReportsPluginJobHook(JobHook):
    def schedule(self, job, orm_job):
        pass

    def update(self, job, orm_job, state=None, **kwargs):
        if state != State.FAILED:
            return
        from kolibri.core.analytics.tasks import _ping  # noqa: PLC0415
        from kolibri.core.discovery.utils.network.errors import (  # noqa: PLC0415
            NetworkLocationConnectionFailure,
        )
        from kolibri.core.discovery.utils.network.errors import (  # noqa: PLC0415
            NetworkLocationResponseTimeout,
        )

        from .handlers import handle_task_failure  # noqa: PLC0415
        from .tasks import ping_error_reports  # noqa: PLC0415

        # Don't capture the submission task's own failures: recording one
        # would create a task error report that the next pingback tries to
        # submit, and a persistently failing submission would loop forever.
        if job.func == ping_error_reports.func_string:
            return
        if job.func == _ping.func_string and job.exception in (
            NetworkLocationConnectionFailure.__name__,
            NetworkLocationResponseTimeout.__name__,
        ):
            return
        # JobHook.update runs inside the job update's transaction; on SQLite
        # that holds the job storage write lock.
        transaction.on_commit(
            lambda: handle_task_failure(job, orm_job), using=orm_job._state.db
        )

    def clear(self, job, orm_job):
        pass
