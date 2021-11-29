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
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import conf


class Learn(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"
    kolibri_options = "options"


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
        from kolibri.core.content.utils.search import get_all_contentnode_label_metadata
        from kolibri.core.content.api import ChannelMetadataViewSet
        from kolibri.core.content.models import Language

        channel_viewset = ChannelMetadataViewSet()

        channels = channel_viewset.serialize(
            channel_viewset.get_queryset().filter(root__available=True)
        )
        label_metadata = get_all_contentnode_label_metadata()
        languages = list(
            Language.objects.filter(id__in=label_metadata["languages"]).values(
                "id", "lang_name"
            )
        )
        return {
            "allowGuestAccess": get_device_setting("allow_guest_access"),
            "allowLearnerUnassignedResourceAccess": allow_learner_unassigned_resource_access(),
            "enableCustomChannelNav": conf.OPTIONS["Learn"][
                "ENABLE_CUSTOM_CHANNEL_NAV"
            ],
            "isSubsetOfUsersDevice": get_device_setting(
                "subset_of_users_device", False
            ),
            "categories": label_metadata["categories"],
            "learningActivities": label_metadata["learning_activities"],
            "languages": languages,
            "channels": channels,
            "gradeLevels": label_metadata["grade_levels"],
            "accessibilityLabels": label_metadata["accessibility_labels"],
            "learnerNeeds": label_metadata["learner_needs"],
        }


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
