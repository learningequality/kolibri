__version__ = "0.0.2"
def kolibri_userinfo(claims, user):
    """
    Fill claims with the information available in the Kolibri database
    """
    claims["name"] = user.full_name
    COUNTRY = os.environ.get("COUNTRY", None)
    if COUNTRY:
        claims["email"] = "{username}@{country}.org".format(username=user.username, country=COUNTRY)
    return claims
