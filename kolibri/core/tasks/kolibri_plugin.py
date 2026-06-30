from magicbus.plugins import SimplePlugin

from kolibri.plugins.hooks import register_hook
from kolibri.utils.server.hooks import KolibriProcessHook


class ScheduledTasksPlugin(SimplePlugin):
    def START(self):
        from kolibri.core.tasks.registry import TaskRegistry

        TaskRegistry.apply_schedules()


@register_hook
class ScheduledTasksProcessHook(KolibriProcessHook):
    # Apply every task's declared schedule once the server enters START.
    MagicBusPluginClass = ScheduledTasksPlugin
