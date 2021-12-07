from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
from abc import abstractproperty

from kolibri.plugins import hooks

logger = logging.getLogger(__name__)


# previously used for cache busting
THEME_NAME = "themeName"
THEME_VERSION = "themeVersion"

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
APP_BAR = "appBar"
BACKGROUND = "background"
BACKGROUND_IMG_CREDIT = "backgroundImgCredit"
SCRIM_OPACITY = "scrimOpacity"
TITLE = "title"
TITLE_STYLE = "titleStyle"
TOP_LOGO = "topLogo"
LOGO = "logo"
BRANDED_FOOTER = "brandedFooter"
PARAGRAPH_ARRAY = "paragraphArray"
IMG_SRC = "src"
IMG_STYLE = "style"
IMG_ALT = "alt"
SHOW_TITLE = "showTitle"
SHOW_K_FOOTER_LOGO = "showKolibriFooterLogo"
SHOW_POWERED_BY = "showPoweredBy"
POWERED_BY_STYLE = "poweredByStyle"


def _validateMetadata(theme):
    def deprecated_msg(key):
        if key in theme:
            logger.info("Note: '{}' is deprecated as of v0.15.0".format(key))

    deprecated_msg(THEME_NAME)
    deprecated_msg(THEME_VERSION)


def _validateBrandColors(theme):
    if BRAND_COLORS not in theme:
        logger.error("brand colors not defined by theme")
        return

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


def _validateScrimOpacity(theme):
    if SCRIM_OPACITY in theme[SIGN_IN]:
        opacity = theme[SIGN_IN][SCRIM_OPACITY]
        if opacity is None or opacity < 0 or opacity > 1:
            logger.error("scrim opacity should be a value in the closed interval [0,1]")
            return


def _initFields(theme):
    """
    set up top-level dicts if they don't exist
    """
    if SIGN_IN not in theme:
        theme[SIGN_IN] = {}
    if TOKEN_MAPPING not in theme:
        theme[TOKEN_MAPPING] = {}
    if SIDE_NAV not in theme:
        theme[SIDE_NAV] = {}
    if APP_BAR not in theme:
        theme[APP_BAR] = {}


@hooks.define_hook(only_one_registered=True)
class ThemeHook(hooks.KolibriHook):
    """
    A hook to allow custom theming of Kolibri
    Use this tool to help generate your brand colors: https://materialpalettes.com/
    """

    @classmethod
    def get_theme(cls):
        theme = list(cls.registered_hooks)[0].theme
        _initFields(theme)
        _validateMetadata(theme)
        _validateBrandColors(theme)
        _validateScrimOpacity(theme)
        return theme

    @abstractproperty
    def theme(self):
        pass
