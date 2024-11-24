import logging

from magicbus.plugins import SimplePlugin

from kolibri.core.content.hooks import ShareFileHook
from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.core.device.hooks import GetOSUserHook
from kolibri.core.tasks.hooks import JobHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.server.hooks import KolibriProcessHook

logger = logging.getLogger(__name__)


class ExampleAppPlugin(KolibriPluginBase):
    pass


@register_hook
class ExampleAppGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token):
        return "os_user", True


@register_hook
class ExampleAppCheckIsMeteredHook(CheckIsMeteredHook):
    def check_is_metered(self):
        return True


@register_hook
class ExampleAppShareFileHook(ShareFileHook):
    def share_file(self, file_path, message):
        logger.debug(f"Sharing file {file_path} with message {message}")


@register_hook
class ExampleAppJobHook(JobHook):
    def schedule(self, job, orm_job):
        logger.debug(f"Scheduling job {job} with ORM job {orm_job}")

    def update(self, job, orm_job, state=None, **kwargs):
        from kolibri.core.tasks.job import log_status

        log_status(job, orm_job, state=state, **kwargs)

    def clear(self, job, orm_job):
        logger.debug(f"Clearing job {job} with ORM job {orm_job}")


class AppUrlLoggerPlugin(SimplePlugin):
    def SERVING(self, port):
        self.port = port

    def RUN(self):
        from kolibri.core.device.utils import app_initialize_url

        start_url = "http://127.0.0.1:{port}".format(
            port=self.port
        ) + app_initialize_url(auth_token="1234")
        # Use warning to make sure this message stands out in the console
        logger.warning(
            "Open this URL to activate app mode: {start_url}".format(
                start_url=start_url
            )
        )


@register_hook
class DeveloperAppUrlLogger(KolibriProcessHook):
    MagicBusPluginClass = AppUrlLoggerPlugin
