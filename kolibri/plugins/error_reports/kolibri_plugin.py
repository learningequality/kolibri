import logging

from kolibri.core.error_reports.constants import TASK
from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.tasks.hooks import StorageHook
from kolibri.core.tasks.job import State
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook

logger = logging.getLogger(__name__)


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
class ErrorReportsPluginStorageHook(StorageHook):
    def schedule(self, job, orm_job):
        pass

    def update(self, job, orm_job, state=None, **kwargs):
        if state == State.FAILED:
            # Importing here to avoid importing models at the top level
            from kolibri.core.error_reports.middleware import get_packages
            from kolibri.core.error_reports.middleware import get_python_version
            from kolibri.core.error_reports.models import ErrorReport

            ErrorReport.insert_or_update_error(
                TASK,
                job.exception,
                job.traceback,
                context={
                    "job_info": {
                        "job_id": job.job_id,
                        "func": job.func,
                        "facility_id": job.facility_id,
                        "args": job.args,
                        "kwargs": job.kwargs,
                        "progress": job.progress,
                        "total_progress": job.total_progress,
                        "extra_metadata": job.extra_metadata,
                    },
                    "worker_info": {
                        "worker_host": orm_job.worker_host,
                        "worker_process": orm_job.worker_process,
                        "worker_thread": orm_job.worker_thread,
                        "worker_extra": orm_job.worker_extra,
                    },
                    "packages": get_packages(),
                    "python_version": get_python_version(),
                },
            )

    def clear(self, job, orm_job):
        pass
