import logging
from abc import abstractmethod

from kolibri.plugins import hooks

logger = logging.getLogger(__name__)


_TOKEN_MAPPING = "tokenMapping"
_SIGN_IN = "signIn"
_SIDE_NAV = "sideNav"
_APP_BAR = "appBar"


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
        try:
            theme = next(cls.registered_hooks).theme
        except StopIteration:
            logger.warning("No theme hooks registered, using default theme")
            theme = {}
        _initFields(theme)
        return theme

    @property
    @abstractmethod
    def theme(self):
        pass
