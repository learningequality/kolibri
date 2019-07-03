from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.urls import reverse

from . import hooks
from kolibri.core.auth.constants.user_kinds import LEARNER
from kolibri.core.content.hooks import ContentNodeDisplayHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class Learn(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"


class LearnRedirect(RoleBasedRedirectHook):
    role = LEARNER

    @property
    def url(self):
        return self.plugin_url(Learn, "learn")


class LearnNavItem(NavigationHook, webpack_hooks.WebpackBundleHook):
    unique_slug = "learn_module_side_nav"
    src_file = "assets/src/views/LearnSideNavEntry.vue"


class LearnAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "learn_module"
    src_file = "assets/src/app.js"


class LearnInclusionHook(hooks.LearnSyncHook):
    bundle_class = LearnAsset


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
            return reverse("kolibri:learn:learn") + "#/topics/" + kind_slug + node.id
