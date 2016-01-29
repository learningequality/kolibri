"""
Implements a custom auth backend as described in the Django docs. Notably authentication could be provided by the
default Django backend, but authorization (i.e. permissions checking) must be handled by our custom backends since we
do not use the regular Django permissions. See handling authorization docs. Should then be listed in the
AUTHENTICATION_BACKENDS. Note that authentication backends are checked in the order they're listed.
"""
from models import BaseUser, DeviceOwner


class BaseBackend(object):
    """
    Provides the authentication parts that are common to both backends.
    """
    def _authenticate(self, username=None, password=None):
        """
        Returns a BaseUser object if authentication succeeds, else None.

        :param username: A string
        :param password: A string
        """
        try:
            user = BaseUser.objects.get(username=username)
            if user.check_password(password):
                return user
        except BaseUser.DoesNotExist:
            return None


class DeviceBackend(BaseBackend):
    """
    A very simple backend that, when passed in a user for permissions checking, returns True if the user is a
    DeviceAdmin, or False otherwise.
    """

    def authenticate(self, username=None, password=None):
        """
        Authenticates the user if the credentials correspond to a Device Owner.

        :param username: a string
        :param password: a string
        :return: A DeviceOwner instance if successful, or None if authentication failed *or* the authentication was
          successful but the user is a FacilityUser.
        """
        user = self._authenticate(username, password)
        return DeviceOwner.objects.get(pk=user.pk) if user._is_device_owner else None

    def get_user(self, user_id):
        """
        Gets a user. Auth backends are required to implement this.

        :param user_id: A BaseUser pk
        :return: A DeviceOwner instance if a BaseUser with that pk is found, else None.
        """
        try:
            user = DeviceOwner.objects.get(pk=user_id)
            return user if user._is_device_owner else None
        except DeviceOwner.DoesNotExist:
            return None
