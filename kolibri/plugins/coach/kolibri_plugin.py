import logging

from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _


logger = logging.getLogger(__name__)


class Coach(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"
    can_manage_while_running = True

    def name(self, lang):
        with translation.override(lang):
            return _("Coach")


@register_hook
class CoachRedirect(RoleBasedRedirectHook):
    roles = (COACH,)
    require_full_facility = True
    require_no_on_my_own_facility = True

    @property
    def url(self):
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
