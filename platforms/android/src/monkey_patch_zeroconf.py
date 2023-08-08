import zeroconf
from jnius import autoclass

AndroidString = autoclass("java.lang.String")


def get_all_addresses():
    addresses = []
    try:
        NetworkInterface = autoclass("java.net.NetworkInterface")
        Inet4Address = autoclass("java.net.Inet4Address")
        ifaces = NetworkInterface.getNetworkInterfaces()
        while ifaces and ifaces.hasMoreElements():
            iface = ifaces.nextElement()
            ips = iface.getInetAddresses()
            while ips and ips.hasMoreElements():
                ip = ips.nextElement()
                # There are no methods for checking IP address type, so check object type.
                address = ip.getHostAddress()
                if isinstance(ip, Inet4Address):
                    addresses.append(address)
    except Exception:
        return []

    return addresses


zeroconf.get_all_addresses = get_all_addresses
