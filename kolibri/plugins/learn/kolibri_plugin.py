from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.urls import reverse

from kolibri.core.auth.constants.user_kinds import ANONYMOUS
from kolibri.core.auth.constants.user_kinds import LEARNER
from kolibri.core.content.hooks import ContentNodeDisplayHook
from kolibri.core.device.utils import allow_learner_unassigned_resource_access
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import is_landing_page
from kolibri.core.device.utils import LANDING_PAGE_LEARN
from kolibri.core.discovery.hooks import NetworkLocationBroadcastHook
from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import conf
from kolibri.utils import translation
from kolibri.utils.translation import ugettext as _


class Learn(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"
    kolibri_options = "options"
    can_manage_while_running = True

    def name(self, lang):
        with translation.override(lang):
            return _("Learn")


@register_hook
class LearnRedirect(RoleBasedRedirectHook):
    @property
    def roles(self):
        if is_landing_page(LANDING_PAGE_LEARN):
            return (ANONYMOUS, LEARNER)

        return (LEARNER,)

    @property
    def url(self):
        return self.plugin_url(Learn, "learn")


@register_hook
class LearnNavItem(NavigationHook):
    bundle_id = "side_nav"


@register_hook
class LearnAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL
        from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID

        return {
            "allowGuestAccess": get_device_setting("allow_guest_access"),
            "allowLearnerDownloads": get_device_setting(
                "allow_learner_download_resources"
            ),
            "allowLearnerUnassignedResourceAccess": allow_learner_unassigned_resource_access(),
            "enableCustomChannelNav": conf.OPTIONS["Learn"][
                "ENABLE_CUSTOM_CHANNEL_NAV"
            ],
            "studioDevice": {
                "base_url": CENTRAL_CONTENT_BASE_URL,
                "instance_id": CENTRAL_CONTENT_BASE_INSTANCE_ID,
            },
        }


@register_hook
class MyDownloadsAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "my_downloads_app"


@register_hook
class LearnContentNodeHook(ContentNodeDisplayHook):
    def node_url(self, node):
        kind_slug = None
        if not node.parent:
            kind_slug = ""
        elif node.kind == "topic":
            kind_slug = "t/"
        else:
            kind_slug = "c/"
        if kind_slug is not None:
            return (
                reverse("kolibri:kolibri.plugins.learn:learn")
                + "#/topics/"
                + kind_slug
                + node.id
            )


class DiscoveryHookMixin(object):
    def _learner_ids(self):
        """
        :return: A list of all learner ids
        :rtype: str[]
        """
        from kolibri.core.auth.models import FacilityUser

        return FacilityUser.objects.all().values_list("id", flat=True)

    def _begin_request_soud_sync(self, network_location):
        """
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        from kolibri.core.auth.tasks import begin_request_soud_sync

        for user_id in self._learner_ids():
            begin_request_soud_sync(network_location.base_url, user_id)


@register_hook
class NetworkDiscoveryForSoUDHook(NetworkLocationDiscoveryHook, DiscoveryHookMixin):
    def on_connect(self, network_location):
        """
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        if (
            get_device_setting("subset_of_users_device")
            and not network_location.subset_of_users_device
        ):
            self._begin_request_soud_sync(network_location)

    def on_disconnect(self, network_location):
        """
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        from kolibri.core.auth.tasks import stop_request_soud_sync

        if (
            get_device_setting("subset_of_users_device")
            and not network_location.subset_of_users_device
        ):
            for user_id in self._learner_ids():
                stop_request_soud_sync(network_location.base_url, user_id)


@register_hook
class NetworkBroadcastForSoUDHook(NetworkLocationBroadcastHook, DiscoveryHookMixin):
    """
    This hook is used to hook into the broadcast of the SoUD status of this device to other
    devices on the network. So when this device is updated, possibly to SoUD, it will
    enqueue SoUD syncs to all other non-SoUD devices on the network.
    """

    def on_renew(self, instance, network_locations):
        """
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        :type network_locations: kolibri.core.discovery.models.NetworkLocation[]
        """
        if not get_device_setting("subset_of_users_device"):
            return

        for network_location in network_locations:
            if not network_location.subset_of_users_device:
                self._begin_request_soud_sync(network_location)


@register_hook
class MyDownloadsNavAction(NavigationHook):
    bundle_id = "my_downloads_side_nav"

    @property
    def plugin_data(self):
        return {
            "allowLearnerDownloads": get_device_setting(
                "allow_learner_download_resources"
            ),
        }
