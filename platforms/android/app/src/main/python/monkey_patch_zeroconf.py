import sys

# kolibri import must come first: it puts its dist folder (zeroconf) on sys.path
import kolibri
import zeroconf
from java import jclass

NetworkUtils = jclass("org.learningequality.Kolibri.util.NetworkUtils")


def get_all_addresses():
    # Get Java List and convert to Python list
    # Chaquopy Java collections need explicit conversion via toArray()
    java_list = NetworkUtils.getActiveIPv4Addresses()
    return [str(addr) for addr in java_list.toArray()]


# kolibri.utils.server binds get_all_addresses at import time; a stale (ifaddr)
# binding disagrees with the patched one, making ZeroConfPlugin.addresses_changed
# permanently True, so the broadcast restarts every 5s and discovery breaks.
assert "kolibri.utils.server" not in sys.modules, (
    "monkey_patch_zeroconf must be imported before kolibri.utils.server"
)

zeroconf.get_all_addresses = get_all_addresses
