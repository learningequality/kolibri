from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging

from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import ugettext as _


logger = logging.getLogger(__name__)


class Coach(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    can_manage_while_running = True

    @property
    def translated_view_urls(self):
        # On an SoUD this plugin should be disabled. In lieu of properly
        # disabling the plugin, we will just not register any urls for now
        if not get_device_setting("subset_of_users_device", False):
            return "urls"
        return None

    def name(self, lang):
        with translation.override(lang):
            return _("Coach")


@register_hook
class CoachRedirect(RoleBasedRedirectHook):
    roles = (COACH,)

    @property
    def url(self):
        # Also disable attempting to redirect to the coach page
        # if we are on a subset of users device.
        if not get_device_setting("subset_of_users_device", False):
            return self.plugin_url(Coach, "coach")


@register_hook
class CoachNavItem(NavigationHook):
    bundle_id = "side_nav"


@register_hook
class CoachAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        from kolibri.core.content.models import ContentNode

        practice_quizzes_exist = ContentNode.objects.filter(
            available=True, options__contains='"modality": "QUIZ"'
        ).exists()
        return {
            "practice_quizzes_exist": practice_quizzes_exist,
        }


@register_hook
class NetworkDiscoveryForSoUDHook(NetworkLocationDiscoveryHook):
    def on_disconnect(self, network_location):
        """
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        from kolibri.core.auth.tasks import queue_soud_server_sync_cleanup

        if (
            not get_device_setting("subset_of_users_device", default=False)
            and network_location.subset_of_users_device
        ):
            logger.debug("SoUD listener: triggering cleanup of SoUD sync")
            queue_soud_server_sync_cleanup(network_location.instance_id)
