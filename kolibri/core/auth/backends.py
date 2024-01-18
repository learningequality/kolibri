"""
Implements custom auth backends as described in the Django docs, for our custom user class -- FacilityUser.
The appropriate classes should be listed in the AUTHENTICATION_BACKENDS. Note that authentication
backends are checked in the order they're listed.
"""
from kolibri.core.auth.models import FacilityUser


FACILITY_CREDENTIAL_KEY = "facility"


class FacilityUserBackend(object):
    """
    A class that implements authentication for FacilityUsers.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticates the user if the credentials correspond to a FacilityUser for the specified Facility.

        :param request: The request is a required positional argument in newer versions of Django
        :param username: a string
        :param password: a string
        :param kwargs: a dict of additional credentials (see `keyword`s)
        :keyword facility: a Facility object or facility ID
        :return: A FacilityUser instance if successful, or None if authentication failed.
        """
        facility = kwargs.get(FACILITY_CREDENTIAL_KEY, None)
        # First, attempt case-sensitive login
        user = self.authenticate_case_sensitive(username, password, facility)
        if user:
            return user

        # If case-sensitive login fails, attempt case-insensitive login
        user = self.authenticate_case_insensitive(username, password, facility)
        return user

    def _authenticate_users(self, users, password, facility):
        if facility:
            users = users.filter(facility=facility)
        for user in users:
            if user.check_password(password):
                return user
            # Allow login without password for learners for facilities that allow this.
            # Must specify the facility, to prevent accidental logins
            elif (
                facility
                and user.dataset.learner_can_login_with_no_password
                and not user.roles.count()
                and not user.is_superuser
            ):
                return user
        return None

    def authenticate_case_sensitive(self, username, password, facility):
        users = FacilityUser.objects.filter(username=username)
        return self._authenticate_users(users, password, facility)

    def authenticate_case_insensitive(self, username, password, facility):
        users = FacilityUser.objects.filter(username__iexact=username)
        return self._authenticate_users(users, password, facility)

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
