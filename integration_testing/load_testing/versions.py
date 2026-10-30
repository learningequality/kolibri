from packaging.version import InvalidVersion
from packaging.version import Version


def parse_version(version):
    try:
        return Version(Version(version).public)
    except InvalidVersion:
        return None
