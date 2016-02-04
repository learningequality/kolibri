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


def get_facility_model():
    return djapps.get_model('kolibriauth', 'Facility')


def get_classroom_model():
    return djapps.get_model('kolibriauth', 'Classroom')


def get_learner_group_model():
    return djapps.get_model('kolibriauth', 'LearnerGroup')


def get_collection_proxies():
    """
    Taking a cue from Django to avoid circular imports
    :return: A tuple of Collection proxies, (Facility, Classroom, LearnerGroup)
    """
    return get_facility_model(), get_classroom_model(), get_learner_group_model()


def get_facility_admin_model():
    return djapps.get_model('kolibriauth', 'FacilityAdmin')


def get_coach_model():
    return djapps.get_model('kolibriauth', 'Coach')


def get_learner_model():
    return djapps.get_model('kolibriauth', 'Learner')


def get_role_proxies():
    """
    Taking a cue from Django to avoid circular imports
    :return: A tuple of Role proxies, (FacilityAdmin, Coach, Learner)
    """
    return get_facility_admin_model(), get_coach_model(), get_learner_model()
