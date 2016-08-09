"""
Implements custom auth backends as described in the Django docs, for our custom user classes -- FacilityUser and
DeviceOwner. The appropriate classes should be listed in the AUTHENTICATION_BACKENDS. Note that authentication
backends are checked in the order they're listed.
"""

from kolibri.auth.models import DeviceOwner, FacilityUser


class FacilityUserBackend(object):
    """
    A class that implements authentication for FacilityUsers.
    """

    def authenticate(self, username=None, password=None, facility=None):
        """
        Authenticates the user if the credentials correspond to a FacilityUser for the specified Facility.

        :param username: a string
        :param password: a string
        :param facility: a Facility
        :return: A FacilityUser instance if successful, or None if authentication failed.
        """
        users = FacilityUser.objects.filter(username=username)
        if facility:
            users = users.filter(facility=facility)
        for user in users:
            if user.check_password(password):
                return user
        return None

    def get_user(self, user_id):
        """
        Gets a user. Auth backends are required to implement this.

        :param user_id: A FacilityUser pk
        :return: A FacilityUser instance if a BaseUser with that pk is found, else None.
        """
        try:
            return FacilityUser.objects.get(pk=user_id)
        except FacilityUser.DoesNotExist:
            return None


class DeviceOwnerBackend(object):
    """
    A class that implements authentication for DeviceOwners.
    """

    def authenticate(self, username=None, password=None, **kwargs):
        """
        Authenticates the user if the credentials correspond to a DeviceOwner.

        :param username: a string
        :param password: a string
        :return: A DeviceOwner instance if successful, or None if authentication failed.
        """
        try:
            user = DeviceOwner.objects.get(username=username)
            if user.check_password(password):
                return user
            else:
                return None
        except DeviceOwner.DoesNotExist:
            return None

    def get_user(self, user_id):
        """
        Gets a user. Auth backends are required to implement this.

        :param user_id: A BaseUser pk
        :return: A DeviceOwner instance if a BaseUser with that pk is found, else None.
        """
        try:
            return DeviceOwner.objects.get(pk=user_id)
        except DeviceOwner.DoesNotExist:
            return None
