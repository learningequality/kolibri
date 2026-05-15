"""
Implements custom auth backends as described in the Django docs, for our custom user class -- FacilityUser.
The appropriate classes should be listed in the AUTHENTICATION_BACKENDS. Note that authentication
backends are checked in the order they're listed.
"""
import abc

from django.contrib.sessions.backends.db import SessionStore as DBStore
from django.db.models import Exists
from django.db.models import OuterRef
from django.utils.functional import cached_property

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.models import Session
from kolibri.core.device.utils import is_full_facility_import


FACILITY_CREDENTIAL_KEY = "facility"


class FacilityAuthScope(abc.ABC):
    """Base facility scope for authentication"""

    def __init__(self, facility_or_id):
        """
        :param facility_or_id: The facility ID string or a Facility object
        """
        self.facility_or_id = facility_or_id

    @cached_property
    def dataset_id(self):
        """
        Resolves a facility string ID or object to its dataset ID.
        See FacilityUserBackend.authenticate on how it accepts either

        :return: The facility dataset ID
        """
        if not self.facility_or_id:
            return None

        # Resolve dataset_id to leverage the (dataset, picture_password) unique
        # index. facility may be a Facility object or a raw pk/UUID.
        if isinstance(self.facility_or_id, Facility):
            return self.facility_or_id.dataset_id

        try:
            return Facility.objects.values_list("dataset_id", flat=True).get(
                pk=self.facility_or_id
            )
        except Facility.DoesNotExist:
            return None

    @cached_property
    def is_subset_of_users_device(self):
        return self.dataset_id and not is_full_facility_import(self.dataset_id)

    def get_candidate_users(self):
        """
        Determines candidate users for checking authorization
        :return: A queryset of FacilityUser objects
        """
        qs = FacilityUser.objects.all()
        if self.dataset_id:
            qs = qs.filter(dataset_id=self.dataset_id)
        # users who have the most roles could be more active than users who have less, but instead
        # of trying to authenticate them first, through ordering, we just prioritize by date joined
        return qs.annotate(
            has_roles=Exists(Role.objects.filter(user_id=OuterRef("pk"))),
        ).order_by("-has_roles", "date_joined")

    @abc.abstractmethod
    def matches_credentials(self, user):
        """
        Determines whether this user is authorized
        :param user: A FacilityUser object
        :return: A boolean indicating authorization
        """
        pass


class UsernameAuthScope(FacilityAuthScope):
    """Auth scope for username/password authentication"""

    def __init__(self, facility_or_id, username=None, password=None):
        super().__init__(facility_or_id)
        self.username = username
        self.password = password
        self.case_sensitive = True

    def set_case_insensitive(self):
        self.case_sensitive = False

    def get_candidate_users(self):
        qs = super().get_candidate_users()
        if self.case_sensitive:
            return qs.filter(username=self.username)
        return qs.filter(username__iexact=self.username)

    def matches_credentials(self, user):
        """
        Either the provided password matches the user, or the user is a learner and the facility
        configuration allows passwordless sign-in.
        :param user: A FacilityUser object
        :return: Whether the user is authorized
        """
        if user.check_password(self.password):
            return True

        return (
            self.dataset_id
            and user.dataset.learner_can_login_with_no_password
            and not user.has_roles
            and (not user.is_superuser or self.is_subset_of_users_device)
        )


class PicturePasswordAuthScope(FacilityAuthScope):
    """Auth scope for picture password authentication"""

    def __init__(self, facility_or_id, picture_password=None):
        super().__init__(facility_or_id)
        self.picture_password = picture_password

    def get_candidate_users(self):
        if not self.dataset_id:
            return FacilityUser.objects.none()
        return (
            super().get_candidate_users().filter(picture_password=self.picture_password)
        )

    def matches_credentials(self, user):
        """
        Validates that the user is a learner and that the facility configuration allows picture
        password sign-in.
        :param user: A FacilityUser object
        :return: Whether the user is authorized
        """
        return (
            self.dataset_id
            and user.dataset.picture_password_settings is not None
            and not user.has_roles
            and (not user.is_superuser or self.is_subset_of_users_device)
        )


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
        :keyword facility: a Facility object or facility pk
        :keyword picture_password: a dot-separated picture sequence string
        :return: A FacilityUser instance if successful, or None if authentication failed.
        """
        facility = kwargs.get(FACILITY_CREDENTIAL_KEY, None)
        picture_password = kwargs.get("picture_password", None)

        # Picture password authentication path.
        # The None check is load-bearing: filter(picture_password=None) would
        # match rows where the column IS NULL, returning an arbitrary learner.
        if picture_password is not None:
            auth_scope = PicturePasswordAuthScope(facility, picture_password)
            return self._run(auth_scope)

        # First, attempt case-sensitive login
        auth_scope = UsernameAuthScope(facility, username=username, password=password)

        user = self._run(auth_scope)
        if user:
            return user

        # If case-sensitive login fails, attempt case-insensitive login
        auth_scope.set_case_insensitive()
        return self._run(auth_scope)

    def _run(self, auth_scope):
        for user in auth_scope.get_candidate_users():
            if auth_scope.matches_credentials(user):
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
