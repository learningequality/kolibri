import os
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version

try:
    __version__ = version("kolibri-oidc-provider-plugin")
except PackageNotFoundError:
    __version__ = "0.0.0"


def kolibri_userinfo(claims, user):
    """
    Fill claims with the information available in the Kolibri database
    """
    claims["name"] = user.full_name
    COUNTRY = os.environ.get("COUNTRY", None)
    if COUNTRY:
        claims["email"] = "{username}@{country}.org".format(
            username=user.username, country=COUNTRY
        )
    return claims
