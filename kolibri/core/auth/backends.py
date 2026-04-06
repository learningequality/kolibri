"""
Implements custom auth backends as described in the Django docs, for our custom user class -- FacilityUser.
The appropriate classes should be listed in the AUTHENTICATION_BACKENDS. Note that authentication
backends are checked in the order they're listed.
"""
from django.contrib.sessions.backends.db import SessionStore as DBStore
from django.db.models import Q

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Session


FACILITY_CREDENTIAL_KEY = "facility"


class FacilityUserBackend:
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
        :keyword facility: a Facility object (required as an object when picture_password
            is used, because _authenticate_picture_password accesses facility.dataset_id)
        :keyword picture_password: a dot-separated picture sequence string
        :return: A FacilityUser instance if successful, or None if authentication failed.
        """
        facility = kwargs.get(FACILITY_CREDENTIAL_KEY, None)
        picture_password = kwargs.get("picture_password", None)

        # Picture password authentication path.
        # The None check is load-bearing: filter(picture_password=None) would
        # match rows where the column IS NULL, returning an arbitrary learner.
        if picture_password is not None:
            return self._authenticate_picture_password(picture_password, facility)

        # First, attempt case-sensitive login
        user = self.authenticate_case_sensitive(username, password, facility)
        if user:
            return user

        # If case-sensitive login fails, attempt case-insensitive login
        user = self.authenticate_case_insensitive(username, password, facility)
        return user

    def _authenticate_picture_password(self, picture_password, facility):
        if not facility:
            return None
        # Two separate .filter() calls are intentional: chaining role and
        # devicepermissions conditions in one call would produce a cross-product
        # JOIN that returns false positives for users with multiple related rows.
        return (
            FacilityUser.objects.filter(
                picture_password=picture_password,
                # Filter by dataset_id (not facility) to leverage the
                # (dataset, picture_password) unique index on FacilityUser.
                dataset_id=facility.dataset_id,
                # Restrict to learners only (no facility roles).
                roles__isnull=True,
            )
            .filter(
                # Exclude device superusers; allow users with no devicepermissions row.
                Q(devicepermissions__is_superuser=False)
                | Q(devicepermissions__isnull=True)
            )
            .first()
        )

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


class SessionStore(DBStore):
    @classmethod
    def get_model_class(cls):
        return Session

    def create_model_instance(self, data):
        obj = super().create_model_instance(data)
        try:
            user_id = data.get("_auth_user_id")
        except (ValueError, TypeError):
            user_id = None
        obj.user_id = user_id
        return obj

    @classmethod
    def delete_all_sessions(cls, user_ids):
        store = cls()
        sessions = store.get_model_class().objects.filter(user_id__in=user_ids)
        sessions.delete()
