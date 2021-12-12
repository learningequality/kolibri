from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
from abc import abstractproperty

from kolibri.plugins import hooks

logger = logging.getLogger(__name__)


_TOKEN_MAPPING = "tokenMapping"
_BRAND_COLORS = "brandColors"
_SIGN_IN = "signIn"
_SIDE_NAV = "sideNav"
_APP_BAR = "appBar"


def _validateBrandColors(theme):
    if _BRAND_COLORS not in theme:
        logger.error("brand colors not defined by theme")
        return

    required_colors = ["primary", "secondary"]
    color_names = [
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
    for color in required_colors:
        if color not in theme[_BRAND_COLORS]:
            logger.error("'{}' not defined by theme".format(color))
        for name in color_names:
            if name not in theme[_BRAND_COLORS][color]:
                logger.error("{} '{}' not defined by theme".format(color, name))


def _validateScrimOpacity(theme):
    SCRIM_OPACITY = "scrimOpacity"
    if SCRIM_OPACITY in theme[_SIGN_IN]:
        opacity = theme[_SIGN_IN][SCRIM_OPACITY]
        if opacity is None or opacity < 0 or opacity > 1:
            logger.error("scrim opacity should be a value in the closed interval [0,1]")
            return


def _initFields(theme):
    """
    set up top-level dicts if they don't exist
    """
    if _SIGN_IN not in theme:
        theme[_SIGN_IN] = {}
    if _TOKEN_MAPPING not in theme:
        theme[_TOKEN_MAPPING] = {}
    if _SIDE_NAV not in theme:
        theme[_SIDE_NAV] = {}
    if _APP_BAR not in theme:
        theme[_APP_BAR] = {}


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
        _validateBrandColors(theme)
        _validateScrimOpacity(theme)
        return theme

    @abstractproperty
    def theme(self):
        pass
