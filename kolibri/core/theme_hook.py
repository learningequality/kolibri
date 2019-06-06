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


# These constants are used by theme.js and the $theme mixin on the front-end
TOKEN_MAPPING = "tokenMapping"
BRAND_COLORS = "brandColors"
PRIMARY = "primary"
SECONDARY = "secondary"
COLOR_V50 = "v_50"
COLOR_V100 = "v_100"
COLOR_V200 = "v_200"
COLOR_V300 = "v_300"
COLOR_V400 = "v_400"
COLOR_V500 = "v_500"
COLOR_V600 = "v_600"
COLOR_V700 = "v_700"
COLOR_V800 = "v_800"
COLOR_V900 = "v_900"
SIGN_IN = "signIn"
SIDE_NAV = "sideNav"
BACKGROUND = "background"
TITLE = "title"
TOP_LOGO = "topLogo"
IMG_SRC = "src"
IMG_STYLE = "style"
IMG_ALT = "alt"
SHOW_K_FOOTER_LOGO = "showKolibriFooterLogo"

# This is the image file name that will be used when customizing the sign-in background
# image using the 'kolibri manage background' command. It does not attempt to use a file
# extension (like .jpg) because we don't know if it's a JPG, SVG, PNG, etc...
DEFAULT_BG_IMAGE_NAME = "background_image"


class ThemeHook(hooks.KolibriHook):
    """
    A hook to allow custom theming of Kolibri
    Use this tool to help generate your brand colors: https://materialpalettes.com/
    """

    class Meta:
        abstract = True

    def validateBrandColors(self, theme):
        if BRAND_COLORS not in theme:
            logger.error("brand colors not defined by theme")
            return False
        required_colors = [PRIMARY, SECONDARY]
        color_names = [
            COLOR_V50,
            COLOR_V100,
            COLOR_V200,
            COLOR_V300,
            COLOR_V400,
            COLOR_V500,
            COLOR_V600,
            COLOR_V700,
            COLOR_V800,
            COLOR_V900,
        ]
        for color in required_colors:
            if color not in theme[BRAND_COLORS]:
                logger.error("'{}' not defined by theme".format(color))
            for name in color_names:
                if name not in theme[BRAND_COLORS][color]:
                    logger.error("{} '{}' not defined by theme".format(color, name))

    @property
    @hooks.only_one_registered
    def theme(self):
        theme = list(self.registered_hooks)[0].theme

        # set up top-level dicts if they don't exist
        if SIGN_IN not in theme:
            theme[SIGN_IN] = {}
        if TOKEN_MAPPING not in theme:
            theme[TOKEN_MAPPING] = {}
        if SIDE_NAV not in theme:
            theme[SIDE_NAV] = {}

        # some validation
        self.validateBrandColors(theme)

        # if a background image has been locally set using the `manage background` command, use it
        if os.path.exists(os.path.join(settings.MEDIA_ROOT, DEFAULT_BG_IMAGE_NAME)):
            theme[SIGN_IN][BACKGROUND] = urljoin(
                settings.MEDIA_URL, DEFAULT_BG_IMAGE_NAME
            )

        return theme
