def kolibri_userinfo(claims, user):
    """
    Fill claims with the information available in the Kolibri database
    """
    claims["name"] = user.full_name
    return claims
