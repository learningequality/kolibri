import logging

from kolibri.core.discovery.tasks import add_dynamic_network_location
from kolibri.core.discovery.tasks import dispatch_broadcast_hooks
from kolibri.core.discovery.tasks import generate_job_id
from kolibri.core.discovery.tasks import remove_dynamic_network_location
from kolibri.core.discovery.tasks import reset_connection_states
from kolibri.core.discovery.tasks import TYPE_ADD
from kolibri.core.discovery.tasks import TYPE_REMOVE
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener
from kolibri.core.tasks.job import Priority

logger = logging.getLogger(__name__)


class NetworkLocationListener(KolibriInstanceListener):
    """
    Listener that subscribes to events to manage corresponding `NetworkLocation` models
    """

    def register_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        # when we start broadcasting, enqueue task to reset all connection states
        reset_connection_states.enqueue(args=(self.broadcast.id,))

    def renew_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        dispatch_broadcast_hooks.enqueue(args=("on_renew", instance.to_dict()))

    def unregister_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        # when we stop broadcasting, enqueue task to reset all connection states
        reset_connection_states.enqueue(args=(self.broadcast.id,))

    def _get_dynamic_network_location_task_priority(self, instance):
        priority = Priority.REGULAR
        is_current_device_lod = self.broadcast.instance.device_info.get(
            "subset_of_users_device", False
        )
        is_discovered_device_lod = instance.device_info.get(
            "subset_of_users_device", False
        )

        # If the current device is not an LOD,
        # OR
        # the current device is an LOD and the discovered device is not an LOD,
        # then enqueue with high priority.
        if (not is_current_device_lod) or (
            is_current_device_lod and not is_discovered_device_lod
        ):
            priority = Priority.HIGH
        return priority

    def add_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        priority = self._get_dynamic_network_location_task_priority(instance)

        add_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_ADD, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
            priority=priority,
        )

    def update_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        # enqueue as 'add' because update event could fire immediately after 'add', so this dedupes
        # the tasks, and it also doesn't do anything differently anyway
        priority = self._get_dynamic_network_location_task_priority(instance)

        add_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_ADD, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
            priority=priority,
        )

    def remove_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        remove_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_REMOVE, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
        )
