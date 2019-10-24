import re

from six.moves.urllib.parse import urlparse

from . import errors


# android is served on port 5000
HTTP_PORTS = (8080, 80, 8008, 8000, 5000)
HTTPS_PORTS = (443,)


# from https://stackoverflow.com/a/33214423
def is_valid_hostname(hostname):

    if hostname[-1] == ".":
        # strip exactly one dot from the right, if present
        hostname = hostname[:-1]
    if len(hostname) > 253:
        return False

    labels = hostname.split(".")

    # the TLD must be not all-numeric
    if re.match(r"[0-9]+$", labels[-1]):
        return False

    allowed = re.compile(r"(?!-)[a-z0-9-]{1,63}(?<!-)$", re.IGNORECASE)
    return all(allowed.match(label) for label in labels)


# from https://stackoverflow.com/a/319293
def is_valid_ipv4_address(ip):
    """Validates IPv4 addresses.
    """
    pattern = re.compile(
        r"""
        ^
        (?:
          # Dotted variants:
          (?:
            # Decimal 1-255 (no leading 0's)
            [3-9]\d?|2(?:5[0-5]|[0-4]?\d)?|1\d{0,2}
          |
            0x0*[0-9a-f]{1,2}  # Hexadecimal 0x0 - 0xFF (possible leading 0's)
          |
            0+[1-3]?[0-7]{0,2} # Octal 0 - 0377 (possible leading 0's)
          )
          (?:                  # Repeat 3 times, separated by a dot
            \.
            (?:
              [3-9]\d?|2(?:5[0-5]|[0-4]?\d)?|1\d{0,2}
            |
              0x0*[0-9a-f]{1,2}
            |
              0+[1-3]?[0-7]{0,2}
            )
          ){3}
        |
          0x0*[0-9a-f]{1,8}    # Hexadecimal notation, 0x0 - 0xffffffff
        |
          0+[0-3]?[0-7]{0,10}  # Octal notation, 0 - 037777777777
        |
          # Decimal notation, 1-4294967295:
          429496729[0-5]|42949672[0-8]\d|4294967[01]\d\d|429496[0-6]\d{3}|
          42949[0-5]\d{4}|4294[0-8]\d{5}|429[0-3]\d{6}|42[0-8]\d{7}|
          4[01]\d{8}|[1-3]\d{0,9}|[4-9]\d{0,8}
        )
        $
    """,
        re.VERBOSE | re.IGNORECASE,
    )
    return pattern.match(ip) is not None


# from https://stackoverflow.com/a/319293
def is_valid_ipv6_address(ip):
    """Validates IPv6 addresses.
    """
    pattern = re.compile(
        r"""
        ^
        \s*                         # Leading whitespace
        (?!.*::.*::)                # Only a single wildcard allowed
        (?:(?!:)|:(?=:))            # Colon iff it would be part of a wildcard
        (?:                         # Repeat 6 times:
            [0-9a-f]{0,4}           #   A group of at most four hexadecimal digits
            (?:(?<=::)|(?<!::):)    #   Colon unless preceeded by wildcard
        ){6}                        #
        (?:                         # Either
            [0-9a-f]{0,4}           #   Another group
            (?:(?<=::)|(?<!::):)    #   Colon unless preceeded by wildcard
            [0-9a-f]{0,4}           #   Last group
            (?: (?<=::)             #   Colon iff preceeded by exacly one colon
             |  (?<!:)              #
             |  (?<=:) (?<!::) :    #
             )                      # OR
         |                          #   A v4 address with NO leading zeros
            (?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)
            (?: \.
                (?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)
            ){3}
        )
        \s*                         # Trailing whitespace
        $
    """,
        re.VERBOSE | re.IGNORECASE | re.DOTALL,
    )
    return pattern.match(ip) is not None


def parse_address_into_components(address):

    # if it looks to be an IPv6 address, make sure it is surrounded by square brackets
    if address.count(":") > 2 and re.match(r"^[a-f0-9\:]+$", address):
        address = "[{}]".format(address)

    # ensure that there's a scheme on the address
    if "://" not in address:
        address = "http://" + address

    # parse out the URL into its components
    parsed = urlparse(address)
    p_scheme = parsed.scheme
    p_hostname = parsed.hostname
    p_path = parsed.path.rstrip("/") + "/"
    try:
        p_port = parsed.port
        if not p_port:
            # since urlparse silently excludes some types of bad ports, check and throw ourselves
            split_by_colon = parsed.netloc.split("]")[-1].rsplit(":")
            if len(split_by_colon) > 1:
                extracted_port = split_by_colon[-1]
                raise errors.InvalidPort(extracted_port)
    except ValueError:
        raise errors.InvalidPort(parsed.netloc.rsplit(":")[-1])

    # perform basic validation on the URL components
    if p_scheme not in ("http", "https"):
        raise errors.InvalidScheme(p_scheme)
    if is_valid_ipv6_address(p_hostname):
        p_hostname = "[{}]".format(p_hostname)
    elif not (is_valid_hostname(p_hostname) or is_valid_ipv4_address(p_hostname)):
        raise errors.InvalidHostname(p_hostname)

    return p_scheme, p_hostname, p_port, p_path


def get_normalized_url_variations(address):
    """Takes a URL, hostname, or IP, validates it, and turns it into a list of possible URLs, varying the scheme, port, and path."""

    p_scheme, p_hostname, p_port, p_path = parse_address_into_components(address)

    # build up a list of possible URLs, in priority order
    urls = []
    paths = (p_path,) if p_path == "/" else (p_path, "/")
    for path in paths:
        schemes = ("http", "https") if p_scheme == "http" else ("https", "http")
        for scheme in schemes:
            ports = HTTP_PORTS if scheme == "http" else HTTPS_PORTS
            if p_port:
                ports = (p_port,) + ports
            for port in ports:
                if (scheme == "http" and port == 80) or (
                    scheme == "https" and port == 443
                ):
                    port_component = ""
                else:
                    port_component = ":{port}".format(port=port)
                urls.append(
                    "{scheme}://{hostname}{port}{path}".format(
                        scheme=scheme,
                        hostname=p_hostname,
                        port=port_component,
                        path=path,
                    )
                )

    return urls
