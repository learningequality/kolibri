"""
Kolibri Core hooks
------------------

WIP! Many applications are supposed to live inside the core namespace to make
it explicit that they are part of the core.

Do we put all their hooks in one module or should each app have its own hooks
module?

Anyways, for now to get hooks started, we have some defined here...
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import warnings

from kolibri.plugins import hooks
from django.utils.six.moves.urllib.parse import urljoin
from kolibri.plugins.utils import plugin_url
from django.conf import settings
import os

logger = logging.getLogger(__name__)


class NavigationHook(hooks.KolibriHook):

    # : A string label for the menu item
    label = "Untitled"

    # : A string or lazy proxy for the url
    url = "/"

    # Set this to True so that any time this is mixed in with a
    # frontend asset hook, the resulting frontend code will be rendered inline.
    inline = True

    def get_menu(self):
        menu = {}
        for hook in self.registered_hooks:
            menu[hook.label] = self.url
        return menu

    class Meta:
        abstract = True


class RoleBasedRedirectHook(hooks.KolibriHook):
    # User role to redirect for
    role = None

    # URL to redirect to
    url = None

    # Special flag to only redirect on first login
    # Default to False
    first_login = False

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)

    class Meta:
        abstract = True


THEME_TOKEN_MAPPING = "tokenMapping"
THEME_BRAND_COLORS = "brandColors"
THEME_PRIMARY = "primary"
THEME_SECONDARY = "secondary"
THEME_COLOR_NAMES = [
    "v_50",
    "v_100",
    "v_200",
    "v_300",
    "v_400",
    "v_500",
    "v_600",
    "v_700",
    "v_800",
    "v_900",
]
THEME_SIGN_IN = "signIn"
THEME_SIDE_NAV = "sideNav"
THEME_BG = "background"
THEME_BG_IMAGE_NAME = "background_image"


class ThemeHook(hooks.KolibriHook):
    """
    A hook to allow custom theming of Kolibri
    Use this tool to help generate your brand colors: https://materialpalettes.com/
    """

    def validateBrandColors(self, theme):
        if THEME_BRAND_COLORS not in theme:
            logger.error("brand colors not defined by theme")
            return False
        required_colors = [THEME_PRIMARY, THEME_SECONDARY]
        for color in required_colors:
            if color not in theme[THEME_BRAND_COLORS]:
                logger.error("'{}' not defined by theme".format(color))
            for name in THEME_COLOR_NAMES:
                if name not in theme[THEME_BRAND_COLORS][color]:
                    logger.error("{} '{}' not defined by theme".format(color, name))

    @property
    @hooks.only_one_registered
    def theme(self):
        theme = self.registered_hooks[0].theme

        self.validateBrandColors(theme)

        # if a background image has been locally set using the `manage background` command, use it
        if os.path.exists(os.path.join(settings.MEDIA_ROOT, THEME_BG_IMAGE_NAME)):
            if THEME_SIGN_IN not in theme:
                theme[THEME_SIGN_IN] = {}
            theme[THEME_SIGN_IN][THEME_BG] = urljoin(
                settings.MEDIA_URL, THEME_BG_IMAGE_NAME
            )

        # if tokenMapping is not set, make it an empty object
        if THEME_TOKEN_MAPPING not in theme:
            theme[THEME_TOKEN_MAPPING] = {}

        return theme
