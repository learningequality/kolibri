import logging

from kolibri.core.discovery.tasks import add_dynamic_network_location
from kolibri.core.discovery.tasks import generate_job_id
from kolibri.core.discovery.tasks import remove_dynamic_network_location
from kolibri.core.discovery.tasks import reset_connection_states
from kolibri.core.discovery.tasks import TYPE_ADD
from kolibri.core.discovery.tasks import TYPE_REMOVE
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener

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

    def unregister_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        # when we stop broadcasting, enqueue task to reset all connection states
        reset_connection_states.enqueue(args=(self.broadcast.id,))

    def add_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        add_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_ADD, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
        )

    def update_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        # enqueue as 'add' because update event could fire immediately after 'add', so this dedupes
        # the tasks, and it also doesn't do anything differently anyway
        add_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_ADD, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
        )

    def remove_instance(self, instance):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        """
        remove_dynamic_network_location.enqueue(
            job_id=generate_job_id(TYPE_REMOVE, self.broadcast.id, instance.id),
            args=(self.broadcast.id, instance.to_dict()),
        )
