import sys

# kolibri import must come first: it puts its dist folder (zeroconf) on sys.path
import kolibri  # noqa: F401  # isort: skip
import zeroconf
from jnius import autoclass

NetworkUtils = autoclass("org.learningequality.NetworkUtils")


def get_all_addresses():
    return list(NetworkUtils.getActiveIPv4Addresses())


# kolibri.utils.server binds get_all_addresses at import time; a stale (ifaddr)
# binding disagrees with the patched one, making ZeroConfPlugin.addresses_changed
# permanently True, so the broadcast restarts every 5s and discovery breaks.
assert "kolibri.utils.server" not in sys.modules, (
    "monkey_patch_zeroconf must be imported before kolibri.utils.server"
)

zeroconf.get_all_addresses = get_all_addresses
