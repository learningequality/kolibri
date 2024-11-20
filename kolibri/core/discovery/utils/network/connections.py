import socket
from contextlib import closing
from contextlib import contextmanager
from ipaddress import ip_address

from . import errors
from .client import NetworkClient
from .urls import parse_address_into_components
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import LocationTypes
from kolibri.core.discovery.models import NetworkLocation


def check_if_port_open(base_url, timeout=1):
    scheme, host, port, _ = parse_address_into_components(base_url)

    if not port:
        port = 80 if scheme == "http" else 443

    try:
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(timeout)
            return sock.connect_ex((host, port)) == 0
    except (OSError, IOError):
        # Catch any errors in trying to connect with the socket
        # In Python 2 all socket errors are subclasses of IOError, in Python 3 of OSError
        return False


DEVICE_INFO_EXPIRY = 3
DEVICE_PORT_EXPIRY = 60
DEVICE_INFO_CACHE_KEY = "device_info_cache_{url}"
DEVICE_PORT_CACHE_KEY = "device_port_cache_{url}"


def capture_network_state(network_location, client):
    """
    Captures the state of the `NetworkClient` for after it has made a successful connection, in
    order to save the exact base_url, IP address, and device information

    :param network_location: The NetworkLocation model for capturing network state
    :type network_location: kolibri.core.discovery.models.NetworkLocation
    :param client: The NetworkClient which successfully connected to the location
    :type client: NetworkClient
    """
    from kolibri.core.device.utils import DEVICE_INFO_VERSION
    from kolibri.core.device.utils import device_info_keys

    # having validated the base URL, we can save that
    network_location.base_url = client.base_url
    # save the IP address for static locations
    if network_location.location_type is not LocationTypes.Dynamic:
        remote_ip = client.remote_ip

        network_location.last_known_ip = remote_ip
        network_location.is_local = ip_address(remote_ip).is_private

    # update all device info
    for key in device_info_keys.get(DEVICE_INFO_VERSION, []):
        # don't update the instance ID if it's a reserved location
        if key == "instance_id" and network_location.reserved:
            continue
        setattr(network_location, key, client.device_info.get(key))


@contextmanager
def capture_connection_state(network_location):
    """
    Intended to wrap contexts with usage of `NetworkClient` for a given `NetworkLocation`.
    If a `NetworkClientError` is raised during yielded context, the appropriate connection status is
    saved to the `NetworkLocation` and the number of `connection_faults` is incremented.

    :param network_location: The NetworkLocation model for capturing connection state
    :type network_location: kolibri.core.discovery.models.NetworkLocation
    """
    try:
        # yield for context processing
        yield
        # finally confirm status is OKAY
        network_location.connection_status = ConnectionStatus.Okay
    except (errors.NetworkLocationConnectionFailure, errors.NetworkLocationNotFound):
        network_location.connection_status = ConnectionStatus.ConnectionFailure
    except errors.NetworkLocationResponseFailure:
        network_location.connection_status = ConnectionStatus.ResponseFailure
    except errors.NetworkLocationResponseTimeout:
        network_location.connection_status = ConnectionStatus.ResponseTimeout
    except errors.NetworkLocationInvalidResponse:
        network_location.connection_status = ConnectionStatus.InvalidResponse
    except errors.NetworkLocationConflict:
        network_location.connection_status = ConnectionStatus.Conflict

    # reset connection faults if it was successful
    if network_location.connection_status == ConnectionStatus.Okay:
        network_location.connection_faults = 0
    else:
        # increment the number of faulty connection attempts
        network_location.connection_faults += 1

    # it's possible the network location was deleted while making requests during the context
    if NetworkLocation.objects.filter(id=network_location.id).exists():
        network_location.save()


def update_network_location(network_location):
    """
    Perform a connection check that the network location is contactable and the instance ID matches
    what we expect, or if there was a previous conflict from an instance ID mismatch, we'll check
    the facilities as the final source of truth

    :param network_location: The network location modal
    :type network_location: kolibri.core.discovery.models.NetworkLocation
    """
    from kolibri.core.auth.models import Facility

    prior_status = network_location.connection_status

    with capture_connection_state(network_location):
        with NetworkClient.build_from_network_location(network_location) as client:
            client.connect()
            # if the last connection attempt resulted in a conflict, likely from instance ID
            # mismatch, then we fall back to checking the facilities
            if prior_status == ConnectionStatus.Conflict:
                response = client.get("api/public/v1/facility")
                network_location_facilities = response.json()
                network_location_facility_ids = [
                    f.get("id") for f in network_location_facilities
                ]

                if not Facility.objects.filter(
                    id__in=network_location_facility_ids
                ).exists():
                    raise errors.NetworkLocationConflict(
                        "Instance does not have matching facility"
                    )
            elif (
                not network_location.reserved
                and network_location.instance_id
                and network_location.instance_id
                != client.device_info.get("instance_id")
            ):
                raise errors.NetworkLocationConflict(
                    "Instances do not match | {} != {}".format(
                        network_location.instance_id,
                        client.device_info.get("instance_id"),
                    )
                )
            # finally, capture the location's network state (ip, url, etc)
            capture_network_state(network_location, client)
