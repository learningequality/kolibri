from django.apps import apps as djapps


def get_user_models():
    """
    Taking a cue from Django to avoid circular imports
    :return: A tuple of our user Classes, (BaseUser, FacilityUser, DeviceOwner)
    """
    return (djapps.get_model('kolibriauth', 'BaseUser'), djapps.get_model('kolibriauth', 'FacilityUser'),
            djapps.get_model('kolibriauth', 'DeviceOwner'))


def get_hierarchy_models():
    """
    Taking a cue from Django to avoid circular imports
    :return: A tuple of our hierarchy Classes, (Role, Collection)
    """
    return djapps.get_model('kolibriauth', 'Role'), djapps.get_model('kolibriauth', 'Collection')
