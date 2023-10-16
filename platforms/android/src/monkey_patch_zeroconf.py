import zeroconf
from jnius import autoclass

NetworkUtils = autoclass("org.learningequality.NetworkUtils")


def get_all_addresses():
    return list(NetworkUtils.getActiveIPv4Addresses())


zeroconf.get_all_addresses = get_all_addresses
