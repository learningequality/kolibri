"""
We have four main abstractions: Users, Collections, Memberships, and Roles.

Users represent people, like students in a school, teachers for a classroom, or volunteers setting up informal
installations. A ``FacilityUser`` belongs to a particular facility, and has permissions only with respect to other data
that is associated with that facility. ``FacilityUser`` accounts (like other facility data) may be synced across multiple
devices.

Collections form a hierarchy, with Collections able to belong to other Collections. Collections are subdivided
into several pre-defined levels (``Facility`` > ``Classroom`` > ``LearnerGroup``).

A ``FacilityUser`` (but not a ``DeviceOwner``) can be marked as a member of a ``Collection`` through a ``Membership``
object. Being a member of a Collection also means being a member of all the Collections above that Collection in the
hierarchy.

Another way in which a ``FacilityUser`` can be associated with a particular ``Collection`` is through a ``Role``
object, which grants the user a role with respect to the ``Collection`` and all the collections below it. A ``Role``
object also stores the "kind" of the role (currently, one of "admin" or "coach"), which affects what permissions the
user gains through the ``Role``.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
from threading import local

import six
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.models import UserManager
from django.core import validators
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.db.models.query import Q
from django.db.utils import IntegrityError
from django.utils.encoding import python_2_unicode_compatible
from morango.models import Certificate
from morango.models import SyncableModel
from morango.models import SyncableModelManager
from mptt.models import TreeForeignKey

from .constants import collection_kinds
from .constants import facility_presets
from .constants import morango_sync
from .constants import role_kinds
from .constants import user_kinds
from .errors import IncompatibleDeviceSettingError
from .errors import InvalidCollectionHierarchy
from .errors import InvalidMembershipError
from .errors import InvalidRoleKind
from .errors import UserDoesNotHaveRoleError
from .errors import UserIsNotFacilityUser
from .errors import UserIsNotMemberError
from .permissions.auth import AllCanReadFacilityDataset
from .permissions.auth import AnonUserCanReadFacilities
from .permissions.auth import CoachesCanManageGroupsForTheirClasses
from .permissions.auth import CoachesCanManageMembershipsForTheirGroups
from .permissions.auth import CollectionSpecificRoleBasedPermissions
from .permissions.auth import FacilityAdminCanEditForOwnFacilityDataset
from .permissions.auth import MembersCanReadMembershipsOfTheirCollections
from .permissions.base import BasePermissions
from .permissions.base import RoleBasedPermissions
from .permissions.general import IsAdminForOwnFacility
from .permissions.general import IsFromSameFacility
from .permissions.general import IsOwn
from .permissions.general import IsSelf
from kolibri.core.auth.constants.demographics import choices as GENDER_CHOICES
from kolibri.core.auth.constants.demographics import DEFERRED
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import set_device_settings
from kolibri.core.errors import KolibriValidationError
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


class DatasetCache(local):
    def __init__(self):
        self.deactivate()

    def __enter__(self):
        self.activate()

    def activate(self):
        self._active = True

    def __exit__(self, type, value, traceback):
        self.deactivate()

    def deactivate(self):
        self._active = False
        self.clear()

    def clear(self):
        self._cache = {}

    def get(self, key):
        if self._active:
            return self._cache.get(key)
        return None

    def set(self, key, dataset_id):
        if self._active:
            self._cache[key] = dataset_id
        return None


dataset_cache = DatasetCache()


def _has_permissions_class(obj):
    return hasattr(obj, "permissions") and isinstance(obj.permissions, BasePermissions)


class FacilityDataSyncableModel(SyncableModel):

    morango_profile = morango_sync.PROFILE_FACILITY_DATA

    class Meta:
        abstract = True


@python_2_unicode_compatible
class FacilityDataset(FacilityDataSyncableModel):
    """
    ``FacilityDataset`` stores high-level metadata and settings for a particular ``Facility``.
    It is also the model that all models storing facility data (data that is associated with a
    particular facility, and that inherits from ``AbstractFacilityDataModel``) foreign key onto,
    to indicate that they belong to this particular ``Facility``.
    """

    permissions = (
        AllCanReadFacilityDataset() | FacilityAdminCanEditForOwnFacilityDataset()
    )

    # Morango syncing settings
    morango_model_name = "facilitydataset"

    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    preset = models.CharField(
        max_length=50,
        choices=facility_presets.choices,
        default=facility_presets.default,
    )

    # Facility specific configuration settings
    learner_can_edit_username = models.BooleanField(default=True)
    learner_can_edit_name = models.BooleanField(default=True)
    learner_can_edit_password = models.BooleanField(default=True)
    learner_can_sign_up = models.BooleanField(default=True)
    learner_can_delete_account = models.BooleanField(default=True)
    learner_can_login_with_no_password = models.BooleanField(default=False)
    show_download_button_in_learn = models.BooleanField(default=True)
    registered = models.BooleanField(default=False)

    def __str__(self):
        facilities = self.collection_set.filter(kind=collection_kinds.FACILITY)
        if facilities:
            return "FacilityDataset for {}".format(
                Facility.objects.get(id=facilities[0].id)
            )
        return "FacilityDataset (no associated Facility)"

    def save(self, *args, **kwargs):
        self.ensure_compatibility()
        super(FacilityDataset, self).save(*args, **kwargs)

    def ensure_compatibility(self, *args, **kwargs):
        if self.learner_can_login_with_no_password and self.learner_can_edit_password:
            raise IncompatibleDeviceSettingError(
                "Device Settings [learner_can_login_with_no_password={}] & [learner_can_edit_password={}] "
                "values incompatible together.".format(
                    self.learner_can_login_with_no_password,
                    self.learner_can_edit_password,
                )
            )

    def calculate_source_id(self):
        # if we don't already have a source ID, get one by generating a new root certificate, and using its ID
        if not self._morango_source_id:
            self._morango_source_id = Certificate.generate_root_certificate(
                ScopeDefinitions.FULL_FACILITY
            ).id
        return self._morango_source_id

    @staticmethod
    def compute_namespaced_id(partition_value, source_id_value, model_name):
        # assert partition_value.startswith(FacilityDataset.ID_PLACEHOLDER)
        if model_name != FacilityDataset.morango_model_name:
            raise AssertionError
        # we use the source_id as the ID for the FacilityDataset
        return source_id_value

    def calculate_partition(self):
        return "{id}:allusers-ro".format(id=self.ID_PLACEHOLDER)

    def get_root_certificate(self):
        return Certificate.objects.get(id=self.id)

    def get_owned_certificates(self):
        # return all certificates associated with this facility dataset for which we have the private key
        return Certificate.objects.filter(
            tree_id=self.get_root_certificate().tree_id
        ).exclude(_private_key=None)

    def reset_to_default_settings(self, preset=None):
        from kolibri.core.auth.constants.facility_presets import mappings

        # use the current preset if it is not passed in
        dataset_data = mappings[preset or self.preset]
        for key, value in dataset_data.items():
            setattr(self, key, value)
        self.save()


class AbstractFacilityDataModel(FacilityDataSyncableModel):
    """
    Base model for Kolibri "Facility Data", which is data that is specific to a particular ``Facility``,
    such as ``FacilityUsers``, ``Collections``, and other data associated with those users and collections.
    """

    dataset = models.ForeignKey(FacilityDataset, on_delete=models.CASCADE)

    class Meta:
        abstract = True

    @classmethod
    def get_related_dataset_cache_key(cls, id, db_table):
        return "{id}_{db_table}_dataset".format(id=id, db_table=db_table)

    def cached_related_dataset_lookup(self, related_obj_name):
        """
        Attempt to get the dataset_id either from the cache or the actual related obj instance.

        :param related_obj_name: string representing the name of the related object on this model
        :return: the dataset_id associated with the related obj
        """
        field = self._meta.get_field(related_obj_name)
        key = self.get_related_dataset_cache_key(
            getattr(self, field.attname), field.related_model._meta.db_table
        )
        dataset_id = dataset_cache.get(key)
        if dataset_id is None:
            try:
                dataset_id = getattr(self, related_obj_name).dataset_id
            except ObjectDoesNotExist as e:
                raise ValidationError(e)
            dataset_cache.set(key, dataset_id)
        return dataset_id

    def calculate_source_id(self):
        # by default, we'll use randomly generated source IDs; this can be overridden as desired
        return None

    def clean_fields(self, *args, **kwargs):
        # ensure that we have, or can infer, a dataset for the model instance
        if not self.dataset_id:
            self.ensure_dataset(validating=True)
        super(AbstractFacilityDataModel, self).clean_fields(*args, **kwargs)

    def full_clean(self, *args, **kwargs):
        kwargs["exclude"] = kwargs.get("exclude", []) + getattr(
            self, "FIELDS_TO_EXCLUDE_FROM_VALIDATION", []
        )
        super(AbstractFacilityDataModel, self).full_clean(*args, **kwargs)

    def pre_save(self):
        # before saving, ensure we have a dataset, and convert any validation errors into integrity
        # errors, since by this point the `clean_fields` method should already have prevented
        # this situation from arising
        try:
            self.ensure_dataset()
        except KolibriValidationError as e:
            raise IntegrityError(str(e))

    def save(self, *args, **kwargs):
        self.pre_save()
        super(AbstractFacilityDataModel, self).save(*args, **kwargs)

    def ensure_dataset(self, *args, **kwargs):
        """
        If no dataset has yet been specified, try to infer it. If a dataset has already been specified, to prevent
        inconsistencies, make sure it matches the inferred dataset, otherwise raise a ``KolibriValidationError``.
        If we have no dataset and it can't be inferred, we raise a ``KolibriValidationError`` exception as well.
        """
        inferred_dataset_id = self.infer_dataset(*args, **kwargs)
        if self.dataset_id:
            # make sure currently stored dataset matches inferred dataset, if any
            if inferred_dataset_id and inferred_dataset_id != self.dataset_id:
                raise KolibriValidationError(
                    "This model is not associated with the correct FacilityDataset."
                )
        else:
            # use the inferred dataset, if there is one, otherwise throw an error
            if inferred_dataset_id:
                self.dataset_id = inferred_dataset_id
            else:
                raise KolibriValidationError(
                    "FacilityDataset ('dataset') not provided, and could not be inferred."
                )

    def infer_dataset(self, *args, **kwargs):
        """
        This method is used by `ensure_dataset` to "infer" which dataset should be associated with this instance.
        It should be overridden in any subclass of ``AbstractFacilityDataModel``, to define a model-specific inference.
        """
        raise NotImplementedError(
            "Subclasses of AbstractFacilityDataModel must override the `infer_dataset` method."
        )


class KolibriAbstractBaseUser(AbstractBaseUser):
    """
    Our custom user type, derived from ``AbstractBaseUser`` as described in the Django docs.
    Draws liberally from ``django.contrib.auth.AbstractUser``, except we exclude some fields
    we don't care about, like email.

    This model is an abstract model, and is inherited by ``FacilityUser``.
    """

    class Meta:
        abstract = True

    USERNAME_FIELD = "username"

    username = models.CharField(
        "username",
        max_length=30,
        help_text="Required. 30 characters or fewer. Letters and digits only",
        validators=[
            validators.RegexValidator(
                r'[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;"\'<>,\.\?]',
                "Enter a valid username. This value can contain only letters, numbers, and underscores.",
                inverse_match=True,
            )
        ],
    )
    full_name = models.CharField("full name", max_length=120, blank=True)
    date_joined = DateTimeTzField("date joined", default=local_now, editable=False)

    is_staff = False
    is_superuser = False
    is_facility_user = False

    can_manage_content = False

    def get_short_name(self):
        return self.full_name.split(" ", 1)[0]

    @property
    def session_data(self):
        """
        Data that is added to the session data at login and during session updates.
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `session_data` property."
        )

    def is_member_of(self, coll):
        """
        Determine whether this user is a member of the specified ``Collection``.

        :param coll: The ``Collection`` for which we are checking this user's membership.
        :return: ``True`` if this user is a member of the specified ``Collection``, otherwise False.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `is_member_of` method."
        )

    def has_role_for_user(self, kinds, user):
        """
        Determine whether this user has (at least one of) the specified role kind(s) in relation to the specified user.

        :param user: The user that is the target of the role (for which this user has the roles).
        :param kinds: The kind (or kinds) of role to check for, as a string or iterable.
        :type kinds: string from ``kolibri.core.auth.constants.role_kinds.*``
        :return: ``True`` if this user has the specified role kind with respect to the target user, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `has_role_for_user` method."
        )

    def has_role_for_collection(self, kinds, coll):
        """
        Determine whether this user has (at least one of) the specified role kind(s) in relation to the specified ``Collection``.

        :param kinds: The kind (or kinds) of role to check for, as a string or iterable.
        :type kinds: string from kolibri.core.auth.constants.role_kinds.*
        :param coll: The target ``Collection`` for which this user has the roles.
        :return: ``True`` if this user has the specified role kind with respect to the target ``Collection``, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `has_role_for_collection` method."
        )

    def can_create_instance(self, obj):
        """
        Checks whether this user (self) has permission to create a particular model instance (obj).

        This method should be overridden by classes that inherit from ``KolibriAbstractBaseUser``.

        In general, unless an instance has already been initialized, this method should not be called directly;
        instead, it should be preferred to call ``can_create``.

        :param obj: An (unsaved) instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to create the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `can_create_instance` method."
        )

    def can_create(self, Model, data):
        """
        Checks whether this user (self) has permission to create an instance of Model with the specified attributes (data).

        This method defers to the ``can_create_instance`` method, and in most cases should not itself be overridden.

        :param Model: A subclass of ``django.db.models.Model``
        :param data: A ``dict`` of data to be used in creating an instance of the Model
        :return: ``True`` if this user should have permission to create an instance of Model with the specified data, else ``False``.
        :rtype: bool
        """
        try:
            instance = Model(**data)
            instance.clean_fields(
                exclude=getattr(Model, "FIELDS_TO_EXCLUDE_FROM_VALIDATION", None)
            )
            instance.clean()
        except TypeError as e:
            logger.error(
                "TypeError while validating model before checking permissions: {}".format(
                    e.args
                )
            )
            # if the data provided does not fit the Model, don't continue checking
            return False
        except ValidationError as e:
            logger.error(e)
            return False  # if the data does not validate, don't continue checking
        # now that we have an instance, defer to the permission-checking method that works with instances
        return self.can_create_instance(instance)

    def can_read(self, obj):
        """
        Checks whether this user (self) has permission to read a particular model instance (obj).

        This method should be overridden by classes that inherit from ``KolibriAbstractBaseUser``.

        :param obj: An instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to read the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `can_read` method."
        )

    def can_update(self, obj):
        """
        Checks whether this user (self) has permission to update a particular model instance (obj).

        This method should be overridden by classes that inherit from KolibriAbstractBaseUser.

        :param obj: An instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to update the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `can_update` method."
        )

    def can_delete(self, obj):
        """
        Checks whether this user (self) has permission to delete a particular model instance (obj).

        This method should be overridden by classes that inherit from KolibriAbstractBaseUser.

        :param obj: An instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to delete the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `can_delete` method."
        )

    def has_role_for(self, kinds, obj):
        """
        Helper function that defers to ``has_role_for_user`` or ``has_role_for_collection`` based on the type of object passed in.
        """
        if isinstance(obj, KolibriAbstractBaseUser):
            return self.has_role_for_user(kinds, obj)
        elif isinstance(obj, Collection):
            return self.has_role_for_collection(kinds, obj)
        else:
            raise ValueError(
                "The `obj` argument to `has_role_for` must be either an instance of KolibriAbstractBaseUser or Collection."
            )

    def filter_readable(self, queryset):
        """
        Filters a queryset down to only the elements that this user should have permission to read.

        :param queryset: A ``QuerySet`` instance that the filtering should be applied to.
        :return: Filtered ``QuerySet`` including only elements that are readable by this user.
        """
        raise NotImplementedError(
            "Subclasses of KolibriAbstractBaseUser must override the `can_delete` method."
        )


class KolibriAnonymousUser(AnonymousUser, KolibriAbstractBaseUser):
    """
    Custom anonymous user that also exposes the same interface as KolibriAbstractBaseUser, for consistency.
    """

    class Meta:
        abstract = True

    @property
    def session_data(self):
        return {
            "username": "",
            "full_name": "",
            "user_id": None,
            "facility_id": getattr(Facility.get_default_facility(), "id", None),
            "kind": [user_kinds.ANONYMOUS],
        }

    def is_member_of(self, coll):
        return False

    def has_role_for_user(self, kinds, user):
        return False

    def has_role_for_collection(self, kinds, coll):
        return False

    def can_create_instance(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_create_object(self, obj)
        return False

    def can_read(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_read_object(self, obj)
        return False

    def can_update(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_update_object(self, obj)
        return False

    def can_delete(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_delete_object(self, obj)
        return False

    def filter_readable(self, queryset):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(queryset.model):
            return queryset.filter(
                queryset.model.permissions.readable_by_user_filter(self)
            ).distinct()
        return queryset.none()


class FacilityUserModelManager(SyncableModelManager, UserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        """
        Creates and saves a User with the given username.
        """
        if not username:
            raise ValueError("The given username must be set")
        if "facility" not in extra_fields:
            extra_fields["facility"] = Facility.get_default_facility()
        if self.filter(
            username__iexact=username, facility=extra_fields["facility"]
        ).exists():
            raise ValidationError("An account with that username already exists")
        user = self.model(username=username, password=password, **extra_fields)
        user.full_clean()
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password, facility=None, full_name=None):

        # import here to avoid circularity
        from kolibri.core.device.models import DevicePermissions

        # get the default facility
        if facility is None:
            facility = Facility.get_default_facility()

        if self.filter(username__iexact=username, facility=facility).exists():
            raise ValidationError("An account with that username already exists")

        # create the new account in that facility
        # gender and birth_year are set to DEFERRED, since superusers do not
        # need to provide this and are not nudged to update profile on Learn page
        superuser = FacilityUser(
            full_name=full_name or username,
            username=username,
            password=password,
            facility=facility,
            gender=DEFERRED,
            birth_year=DEFERRED,
        )
        superuser.full_clean()
        superuser.set_password(password)
        superuser.save()

        # make the user a facility admin
        facility.add_role(superuser, role_kinds.ADMIN)

        # make the user into a superuser on this device
        DevicePermissions.objects.create(
            user=superuser, is_superuser=True, can_manage_content=True
        )
        return superuser


def validate_birth_year(value):
    error = ""

    if value == "NOT_SPECIFIED" or value == "DEFERRED":
        return

    try:
        if int(value) < 1900:
            error = (
                "Birth year {value} is invalid, as it is prior to the year 1900".format(
                    value=value
                )
            )

        elif int(value) > 3000:
            error = (
                "Birth year {value} is invalid, as it is after the year 3000".format(
                    value=value
                )
            )

    except ValueError:
        error = "{value} is not a valid value for birth_year".format(value=value)

    if error != "":
        raise ValidationError(error)


role_kinds_set = {r[0] for r in role_kinds.choices}


def validate_role_kinds(kinds):
    if isinstance(kinds, six.string_types):
        kinds = set([kinds])
    else:
        try:
            kinds = set(kinds)
        except TypeError:
            raise TypeError(
                "kinds argument must be a string or an iterable coerceable to a set"
            )
    if not role_kinds_set.issuperset(kinds):
        raise InvalidRoleKind("kinds argument must only contain valid role kind names")
    return kinds


@python_2_unicode_compatible
class FacilityUser(KolibriAbstractBaseUser, AbstractFacilityDataModel):
    """
    ``FacilityUser`` is the fundamental object of the auth app. These users represent the main users, and can be associated
    with a hierarchy of ``Collections`` through ``Memberships`` and ``Roles``, which then serve to help determine permissions.
    """

    # Morango syncing settings
    morango_model_name = "facilityuser"

    # FacilityUser can be read and written by itself
    own = IsSelf()
    # FacilityUser can be read and written by a facility admin
    admin = IsAdminForOwnFacility()
    # FacilityUser can be read by admin or coach, and updated by admin, but not created/deleted by non-facility admin
    role = RoleBasedPermissions(
        target_field=".",
        can_be_created_by=(),  # we can't check creation permissions by role, as user doesn't exist yet
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN,),
        can_be_deleted_by=(),  # don't want a classroom admin deleting a user completely, just removing them from the class
        collection_field="memberships__collection",
    )
    permissions = own | admin | role

    objects = FacilityUserModelManager()

    facility = models.ForeignKey("Facility", on_delete=models.CASCADE)

    is_facility_user = True

    gender = models.CharField(
        max_length=16, choices=GENDER_CHOICES, default="", blank=True
    )

    birth_year = models.CharField(
        max_length=16, default="", validators=[validate_birth_year], blank=True
    )

    id_number = models.CharField(max_length=64, default="", blank=True)

    @classmethod
    def deserialize(cls, dict_model):
        # be defensive against blank passwords, set to `NOT_SPECIFIED` if blank
        password = dict_model.get("password", "") or ""
        if len(password) == 0:
            dict_model.update(password="NOT_SPECIFIED")

        return super(FacilityUser, cls).deserialize(dict_model)

    def calculate_partition(self):
        return "{dataset_id}:user-ro:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.ID_PLACEHOLDER
        )

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("facility")

    def get_permission(self, permission):
        try:
            return getattr(self.devicepermissions, "is_superuser") or getattr(
                self.devicepermissions, permission
            )
        except ObjectDoesNotExist:
            return False

    def has_morango_certificate_scope_permission(
        self, scope_definition_id, scope_params
    ):
        if self.is_superuser:
            # superusers of a device always have permission to sync
            return True
        if scope_params.get("dataset_id") != self.dataset_id:
            # if the request isn't for the same facility as this user, abort
            return False
        if scope_definition_id == ScopeDefinitions.FULL_FACILITY:
            # if request is for full-facility syncing, return True only if user is a Facility Admin
            return self.has_role_for_collection(role_kinds.ADMIN, self.facility)
        elif scope_definition_id == ScopeDefinitions.SINGLE_USER:
            # for single-user syncing, return True if this user *is* target user, or is admin for target user
            target_user = FacilityUser.objects.get(id=scope_params.get("user_id"))
            if self == target_user:
                return True
            if self.has_role_for_user(role_kinds.ADMIN, target_user):
                return True
            return False
        return False

    @property
    def session_data(self):
        roles = list(self.roles.values_list("kind", flat=True).distinct())

        if self.is_superuser:
            roles.insert(0, user_kinds.SUPERUSER)

        if not roles:
            roles = [user_kinds.LEARNER]

        return {
            "username": self.username,
            "full_name": self.full_name,
            "user_id": self.id,
            "kind": roles,
            "can_manage_content": self.can_manage_content,
            "facility_id": self.facility_id,
        }

    @property
    def can_manage_content(self):
        return self.get_permission("can_manage_content")

    @property
    def is_superuser(self):
        return self.get_permission("is_superuser")

    @property
    def is_staff(self):
        return self.is_superuser

    def is_member_of(self, coll):
        if self.dataset_id != coll.dataset_id:
            return False
        if coll.kind == collection_kinds.FACILITY:
            return self.facility_id == coll.id
        return Membership.objects.filter(user=self, collection=coll).exists()

    def has_role_for_user(self, kinds, user):
        kinds = validate_role_kinds(kinds)
        if self.is_superuser:
            # a superuser has admin role for all users on the device
            return role_kinds.ADMIN in kinds
        if not kinds:
            return False
        if not hasattr(user, "dataset_id") or self.dataset_id != user.dataset_id:
            return False
        return Role.objects.filter(
            Q(user=self, collection_id=user.facility_id, kind__in=kinds)
            | Q(
                user=self,
                collection_id__in=user.memberships.all().values_list(
                    "collection_id", flat=True
                ),
                kind__in=kinds,
            )
        ).exists()

    def has_role_for_collection(self, kinds, coll):
        kinds = validate_role_kinds(kinds)
        if self.is_superuser:
            # a superuser has admin role for all collections on the device
            return role_kinds.ADMIN in kinds
        if not kinds:
            return False
        if self.dataset_id != coll.dataset_id:
            return False
        coll_id = coll.id
        if (
            coll.kind == collection_kinds.LEARNERGROUP
            or coll.kind == collection_kinds.ADHOCLEARNERSGROUP
        ):
            coll_id = coll.parent_id
        return Role.objects.filter(
            Q(user=self, collection_id=self.facility_id, kind__in=kinds)
            | Q(user=self, collection_id=coll_id, kind__in=kinds)
        ).exists()

    def can_create_instance(self, obj):
        if self.is_superuser:
            return True
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_create_object(self, obj)
        return False

    def can_read(self, obj):
        if self.is_superuser:
            return True
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_read_object(self, obj)
        return False

    def can_update(self, obj):
        # Superusers cannot update their own permissions, because they only thing they can do is make themselves
        # not super, we all saw what happened in Superman 2, no red kryptonite here!
        if self.is_superuser and obj != self.devicepermissions:
            return True
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_update_object(self, obj)
        return False

    def can_delete(self, obj):
        # Users cannot delete themselves
        if self == obj:
            return False
        # Superusers cannot update their own permissions, because they only thing they can do is make themselves
        # not super, we all saw what happened in Superman 2, no red kryptonite here!
        if self.is_superuser and obj != self.devicepermissions:
            return True
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_delete_object(self, obj)
        return False

    def filter_readable(self, queryset):
        if self.is_superuser:
            return queryset
        if _has_permissions_class(queryset.model):
            return queryset.filter(
                queryset.model.permissions.readable_by_user_filter(self)
            ).distinct()
        return queryset.none()

    def __str__(self):
        return '"{user}"@"{facility}"'.format(
            user=self.full_name or self.username, facility=self.facility
        )

    def has_perm(self, perm, obj=None):
        # ensure the superuser has full access to the Django admin
        if self.is_superuser:
            return True

    def has_perms(self, perm_list, obj=None):
        # ensure the superuser has full access to the Django admin
        if self.is_superuser:
            return True

    def has_module_perms(self, app_label):
        # ensure the superuser has full access to the Django admin
        if self.is_superuser:
            return True


@python_2_unicode_compatible
class Collection(AbstractFacilityDataModel):
    """
    ``Collections`` are hierarchical groups of ``FacilityUsers``, used for grouping users and making decisions about permissions.
    ``FacilityUsers`` can have roles for one or more ``Collections``, by way of obtaining ``Roles`` associated with those ``Collections``.
    ``Collections`` can belong to other ``Collections``, and user membership in a ``Collection`` is conferred through ``Memberships``.
    ``Collections`` are subdivided into several pre-defined levels.
    """

    # Morango syncing settings
    morango_model_name = None

    # Collection can be read by anybody from the facility; writing is only allowed by an admin for the collection.
    # Furthermore, no FacilityUser can create or delete a Facility. Permission to create a collection is governed
    # by roles in relation to the new collection's parent collection (see CollectionSpecificRoleBasedPermissions).
    permissions = (
        IsFromSameFacility(read_only=True)
        | CollectionSpecificRoleBasedPermissions()
        | AnonUserCanReadFacilities()
        | CoachesCanManageGroupsForTheirClasses()
    )

    _KIND = None  # Should be overridden in subclasses to specify what "kind" they are

    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="children", db_index=True
    )
    kind = models.CharField(max_length=20, choices=collection_kinds.choices)

    def __init__(self, *args, **kwargs):
        if self._KIND:
            kwargs["kind"] = self._KIND
        super(Collection, self).__init__(*args, **kwargs)

    def calculate_partition(self):
        return "{dataset_id}:allusers-ro".format(dataset_id=self.dataset_id)

    def clean_fields(self, *args, **kwargs):
        self._ensure_kind()
        super(Collection, self).clean_fields(*args, **kwargs)

    def save(self, *args, **kwargs):
        self._ensure_kind()
        super(Collection, self).save(*args, **kwargs)

    def _ensure_kind(self):
        """
        Make sure the "kind" is set correctly on the model, corresponding to the appropriate subclass of ``Collection``.
        """
        if self._KIND:
            self.kind = self._KIND

    def get_members(self):
        if self.kind == collection_kinds.FACILITY:
            return FacilityUser.objects.filter(
                dataset=self.dataset
            )  # FacilityUser is always a member of her own facility
        return FacilityUser.objects.filter(memberships__collection=self)

    def get_coaches(self):
        """
        Returns users who have the coach role for this immediate collection.
        """
        return FacilityUser.objects.filter(dataset_id=self.dataset_id).filter(
            roles__kind=role_kinds.COACH, roles__collection=self
        )

    def get_admins(self):
        """
        Returns users who have the admin role for this immediate collection.
        """
        return FacilityUser.objects.filter(dataset_id=self.dataset_id).filter(
            roles__kind=role_kinds.ADMIN, roles__collection=self
        )

    def add_role(self, user, role_kind):
        """
        Create a ``Role`` associating the provided user with this collection, with the specified kind of role.
        If the Role object already exists, just return that, without changing anything.

        :param user: The ``FacilityUser`` to associate with this ``Collection``.
        :param role_kind: The kind of role to give the user with respect to this ``Collection``.
        :return: The ``Role`` object (possibly new) that associates the user with the ``Collection``.
        """

        # ensure the specified role kind is valid
        if role_kind not in role_kinds_set:
            raise InvalidRoleKind(
                "'{role_kind}' is not a valid role kind.".format(role_kind=role_kind)
            )

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only add roles for FacilityUsers.")

        # create the necessary role, if it doesn't already exist
        role, created = Role.objects.get_or_create(
            user=user, collection=self, kind=role_kind
        )

        return role

    def remove_role(self, user, role_kind):
        """
        Remove any ``Role`` objects associating the provided user with this ``Collection``, with the specified kind of role.

        :param user: The ``FacilityUser`` to dissociate from this ``Collection`` (for the specific role kind).
        :param role_kind: The kind of role to remove from the user with respect to this ``Collection``.
        """

        # ensure the specified role kind is valid
        if role_kind not in role_kinds_set:
            raise InvalidRoleKind(
                "'{role_kind}' is not a valid role kind.".format(role_kind=role_kind)
            )

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only remove roles for FacilityUsers.")

        # make sure the user has the role to begin with
        try:
            role = Role.objects.get(user=user, collection=self, kind=role_kind)
        except Role.DoesNotExist:
            raise UserDoesNotHaveRoleError(
                "User does not have this role for this collection."
            )

        # delete the appropriate role, if it exists
        role.delete()

    def add_member(self, user):
        """
        Create a ``Membership`` associating the provided user with this ``Collection``.
        If the ``Membership`` object already exists, just return that, without changing anything.

        :param user: The ``FacilityUser`` to add to this ``Collection``.
        :return: The ``Membership`` object (possibly new) that associates the user with the ``Collection``.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser(
                "You can only add memberships for FacilityUsers."
            )

        # create the necessary membership, if it doesn't already exist
        membership, created = Membership.objects.get_or_create(
            user=user, collection=self
        )

        return membership

    def remove_member(self, user):
        """
        Remove any ``Membership`` objects associating the provided user with this ``Collection``.

        :param user: The ``FacilityUser`` to remove from this ``Collection``.
        :return: ``True`` if a ``Membership`` was removed, ``False`` if there was no matching ``Membership`` to remove.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser(
                "You can only remove memberships for FacilityUsers."
            )

        if not user.is_member_of(self):
            raise UserIsNotMemberError(
                "The user is not a member of the collection, and cannot be removed."
            )

        # delete the appropriate membership
        Membership.objects.filter(user=user, collection=self).delete()

    def infer_dataset(self, *args, **kwargs):
        if self.dataset_id:
            return self.dataset_id
        if self.parent:
            # subcollections inherit dataset from root of their tree
            # (we can't call `get_root` directly on self, as it won't work if self hasn't yet been saved)
            return self.parent.dataset_id
        # the root node (i.e. Facility) must be explicitly tied to a dataset
        return None

    def __str__(self):
        return '"{name}" ({kind})'.format(name=self.name, kind=self.kind)


@python_2_unicode_compatible
class Membership(AbstractFacilityDataModel):
    """
    A ``FacilityUser`` can be marked as a member of a ``Collection`` through a ``Membership`` object. Being a member of a
    ``Collection`` also means being a member of all the ``Collections`` above that ``Collection`` in the tree (i.e. if you
    are a member of a ``LearnerGroup``, you are also a member of the ``Classroom`` that contains that ``LearnerGroup``,
    and of the ``Facility`` that contains that ``Classroom``).
    """

    # Morango syncing settings
    morango_model_name = "membership"

    # users can read their own Memberships
    own = IsOwn(read_only=True)
    # Memberships can be read and written by admins, and read by coaches, for the member user
    role = RoleBasedPermissions(
        target_field="user",
        can_be_created_by=(role_kinds.ADMIN,),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(),  # Membership objects shouldn't be updated; they should be deleted and recreated as needed
        can_be_deleted_by=(role_kinds.ADMIN,),
    )
    # Membership can be written by coaches under the coaches' group
    membership = CoachesCanManageMembershipsForTheirGroups()
    # Members can read memberships of collections they are members of
    own_collections = MembersCanReadMembershipsOfTheirCollections()
    permissions = own | role | membership | own_collections

    user = models.ForeignKey(
        "FacilityUser", related_name="memberships", blank=False, null=False
    )
    # Note: "It's recommended you use mptt.fields.TreeForeignKey wherever you have a foreign key to an MPTT model.
    # https://django-mptt.github.io/django-mptt/models.html#treeforeignkey-treeonetoonefield-treemanytomanyfield
    collection = TreeForeignKey("Collection")

    class Meta:
        unique_together = (("user", "collection"),)

    def calculate_partition(self):
        return "{dataset_id}:user-ro:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.user_id
        )

    def calculate_source_id(self):
        return "{collection_id}".format(collection_id=self.collection_id)

    def infer_dataset(self, *args, **kwargs):
        user_dataset_id = self.cached_related_dataset_lookup("user")
        collection_dataset_id = self.cached_related_dataset_lookup("collection")
        if user_dataset_id != collection_dataset_id:
            raise KolibriValidationError(
                "Collection and user for a Membership object must be in same dataset."
            )
        return user_dataset_id

    def __str__(self):
        return "{user}'s membership in {collection}".format(
            user=self.user, collection=self.collection
        )

    def save(self, *args, **kwargs):
        if self.collection.kind == collection_kinds.FACILITY:
            raise InvalidMembershipError(
                "Cannot create membership objects for facilities, as should already be a member by facility attribute"
            )
        # Can skip checking that the user facility and the classroom are properly related,
        # as infer dataset will check they have the same dataset
        if (
            self.collection.kind == collection_kinds.LEARNERGROUP
            or self.collection.kind == collection_kinds.ADHOCLEARNERSGROUP
        ):
            if not Membership.objects.filter(
                collection_id=self.collection.parent_id, user=self.user
            ).exists():
                raise InvalidMembershipError(
                    "Cannot create membership for a user in a LearnerGroup or AdHoGroup when they are not a member of the parent Classrooom"
                )
        return super(Membership, self).save(*args, **kwargs)

    def delete(self, **kwargs):
        with transaction.atomic():
            # Wrap in a transaction so we don't accidentally wipe out child memberships
            # when deleting the parent membership fails
            if self.collection.kind == collection_kinds.CLASSROOM:
                # If membership is membership of classroom, should also cleanup all
                # memberships of child entities - Learner Groups and AdHoc Groups.
                Membership.objects.filter(
                    user=self.user, collection__in=self.collection.children.all()
                ).delete()
            return super(Membership, self).delete(**kwargs)


@python_2_unicode_compatible
class Role(AbstractFacilityDataModel):
    """
    A ``FacilityUser`` can have a role for a particular ``Collection`` through a ``Role`` object, which also stores
    the "kind" of the ``Role`` (currently, one of "admin" or "coach"). Having a role for a ``Collection`` also
    implies having that role for all sub-collections of that ``Collection`` (i.e. all the ``Collections`` below it
    in the tree).
    """

    # Morango syncing settings
    morango_model_name = "role"
    # users can read their own Roles
    own = IsOwn(read_only=True)
    # Memberships can be read and written by admins, and read by coaches, for the role collection
    role = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN,),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(),  # Role objects shouldn't be updated; they should be deleted and recreated as needed
        can_be_deleted_by=(role_kinds.ADMIN,),
    )
    permissions = own | role

    user = models.ForeignKey(
        "FacilityUser",
        related_name="roles",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    # Note: "It's recommended you use mptt.fields.TreeForeignKey wherever you have a foreign key to an MPTT model.
    # https://django-mptt.github.io/django-mptt/models.html#treeforeignkey-treeonetoonefield-treemanytomanyfield
    collection = TreeForeignKey("Collection")
    kind = models.CharField(max_length=26, choices=role_kinds.choices)

    class Meta:
        unique_together = (("user", "collection", "kind"),)

    def calculate_partition(self):
        return "{dataset_id}:user-ro:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.user_id
        )

    def calculate_source_id(self):
        return "{collection_id}:{kind}".format(
            collection_id=self.collection_id, kind=self.kind
        )

    def infer_dataset(self, *args, **kwargs):
        user_dataset_id = self.cached_related_dataset_lookup("user")
        collection_dataset_id = self.cached_related_dataset_lookup("collection")
        if user_dataset_id != collection_dataset_id:
            raise KolibriValidationError(
                "The collection and user for a Role object must be in the same dataset."
            )
        return user_dataset_id

    def __str__(self):
        return "{user}'s {kind} role for {collection}".format(
            user=self.user, kind=self.kind, collection=self.collection
        )

    def save(self, *args, **kwargs):
        if (
            self.collection.kind == collection_kinds.LEARNERGROUP
            or self.collection.kind == collection_kinds.ADHOCLEARNERSGROUP
        ):
            # We do not currently support roles at the learner group or ad hoc group level
            raise InvalidRoleKind(
                "Cannot assign roles to Learner Groups or AdHoc Groups"
            )
        with transaction.atomic():
            if self.collection.kind == collection_kinds.CLASSROOM:
                # We only support coaches to be assigned at the classroom level currently
                if self.kind != role_kinds.COACH:
                    raise InvalidRoleKind("Can only assign Coach roles to Classrooms")
                if not Role.objects.filter(
                    user=self.user, collection_id=self.collection.parent_id
                ).exists():
                    # If the user doesn't already have a facility role, then create the assignable coach role for the user
                    # at the facility level.
                    Role.objects.create(
                        user=self.user,
                        collection_id=self.collection.parent_id,
                        kind=role_kinds.ASSIGNABLE_COACH,
                    )
            return super(Role, self).save(*args, **kwargs)

    def delete(self, **kwargs):
        with transaction.atomic():
            # Wrap in a transaction so we don't accidentally wipe out role assignments
            # when the base delete fails.
            if (
                self.collection.kind == collection_kinds.FACILITY
                and self.kind == role_kinds.ASSIGNABLE_COACH
            ):
                # If deleting the ASSIGNABLE_COACH role, also delete any classroom coach roles
                Role.objects.filter(
                    user=self.user,
                    collection__in=self.collection.children.all(),
                    kind=role_kinds.COACH,
                ).delete()
            return super(Role, self).delete(**kwargs)


class CollectionProxyManager(SyncableModelManager):
    def get_queryset(self):
        return (
            super(CollectionProxyManager, self)
            .get_queryset()
            .filter(kind=self.model._KIND)
        )


@python_2_unicode_compatible
class Facility(Collection):

    # don't require that we have a dataset set during validation, so we're not forced to generate one unnecessarily
    FIELDS_TO_EXCLUDE_FROM_VALIDATION = ["dataset"]

    morango_model_name = "facility"

    _KIND = collection_kinds.FACILITY

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    @classmethod
    def get_default_facility(cls):
        try:
            default_facility = get_device_setting("default_facility")
        except DeviceNotProvisioned:
            # device has not been provisioned yet, so just return None in this case
            return None
        if not default_facility:
            # Legacy databases will not have this explicitly set.
            # Set this here to ensure future default facility queries are
            # predictable, even if incorrect.
            default_facility = cls.objects.all().first()
            if default_facility:
                set_device_settings(default_facility=default_facility)
        return default_facility

    def save(self, *args, **kwargs):
        if self.parent:
            raise IntegrityError(
                "Facility must be the root of a collection tree, and cannot have a parent."
            )
        super(Facility, self).save(*args, **kwargs)

    def ensure_dataset(self, *args, **kwargs):
        # if we're just validating, we don't want to trigger creation of a FacilityDataset
        if kwargs.get("validating"):
            return
        super(Facility, self).ensure_dataset(*args, **kwargs)

    def infer_dataset(self, *args, **kwargs):
        # if we don't yet have a dataset, create a new one for this facility
        if not self.dataset_id:
            self.dataset = FacilityDataset.objects.create()
        return self.dataset_id

    def get_classrooms(self):
        """
        Returns a QuerySet of Classrooms under this Facility.

        :return: A Classroom QuerySet.
        """
        return Classroom.objects.filter(parent=self)

    def add_admin(self, user):
        return self.add_role(user, role_kinds.ADMIN)

    def add_admins(self, users):
        return [self.add_admin(user) for user in users]

    def remove_admin(self, user):
        self.remove_role(user, role_kinds.ADMIN)

    def add_coach(self, user):
        return self.add_role(user, role_kinds.COACH)

    def add_coaches(self, users):
        return [self.add_coach(user) for user in users]

    def remove_coach(self, user):
        self.remove_role(user, role_kinds.COACH)

    def __str__(self):
        return self.name


@python_2_unicode_compatible
class Classroom(Collection):

    morango_model_name = "classroom"
    morango_model_dependencies = (Facility,)
    _KIND = collection_kinds.CLASSROOM

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        if not self.parent:
            raise IntegrityError(
                "Classroom cannot be the root of a collection tree, and must have a parent."
            )

        if not self.parent.kind == collection_kinds.FACILITY:
            raise InvalidCollectionHierarchy(
                "Classroom must be the child of a Facility"
            )

        super(Classroom, self).save(*args, **kwargs)

    def get_facility(self):
        """
        Gets the ``Classroom``'s parent ``Facility``.

        :return: A ``Facility`` instance.
        """
        return Facility.objects.get(id=self.parent_id)

    def get_learner_groups(self):
        """
        Returns a ``QuerySet`` of ``LearnerGroups`` associated with this ``Classroom``.

        :return: A ``LearnerGroup`` ``QuerySet``.
        """
        return LearnerGroup.objects.filter(parent=self)

    def get_individual_learners_group(self):
        """
        Returns a ``QuerySet`` of ``AdHocGroups``.

        :return A ``AdHocGroup`` ``QuerySet``.
        """
        return AdHocGroup.objects.filter(parent=self)

    def add_admin(self, user):
        return self.add_role(user, role_kinds.ADMIN)

    def add_admins(self, users):
        return [self.add_admin(user) for user in users]

    def remove_admin(self, user):
        self.remove_role(user, role_kinds.ADMIN)

    def add_coach(self, user):
        return self.add_role(user, role_kinds.COACH)

    def add_coaches(self, users):
        return [self.add_coach(user) for user in users]

    def remove_coach(self, user):
        self.remove_role(user, role_kinds.COACH)

    def __str__(self):
        return self.name


@python_2_unicode_compatible
class LearnerGroup(Collection):

    morango_model_name = "learnergroup"
    morango_model_dependencies = (Classroom,)
    _KIND = collection_kinds.LEARNERGROUP

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        if not self.parent:
            raise IntegrityError(
                "LearnerGroup cannot be the root of a collection tree, and must have a parent."
            )
        if not self.parent.kind == collection_kinds.CLASSROOM:
            raise InvalidCollectionHierarchy(
                "LearnerGroup must be the child of a Classroom"
            )
        super(LearnerGroup, self).save(*args, **kwargs)

    def get_classroom(self):
        """
        Gets the ``LearnerGroup``'s parent ``Classroom``.

        :return: A ``Classroom`` instance.
        """
        return Classroom.objects.get(id=self.parent_id)

    def add_learner(self, user):
        return self.add_member(user)

    def add_learners(self, users):
        return [self.add_learner(user) for user in users]

    def remove_learner(self, user):
        return self.remove_member(user)

    def __str__(self):
        return self.name


@python_2_unicode_compatible
class AdHocGroup(Collection):
    """
    An ``AdHocGroup`` is a collection kind that can be used in an assignment
    to create a group that is specific to a single ``Lesson`` or ``Exam``.
    """

    morango_model_name = "adhoclearnersgroup"
    morango_model_dependencies = (Classroom,)
    _KIND = collection_kinds.ADHOCLEARNERSGROUP

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    @classmethod
    def deserialize(cls, dict_model):
        # be defensive against blank names, set to `Ad hoc` if blank
        name = dict_model.get("name", "") or ""
        if len(name) == 0:
            dict_model.update(name="Ad hoc")

        return super(AdHocGroup, cls).deserialize(dict_model)

    def save(self, *args, **kwargs):
        if not self.parent:
            raise IntegrityError(
                "AdHocGroup cannot be the root of a collection tree, and must have a parent."
            )
        if not self.parent.kind == collection_kinds.CLASSROOM:
            raise InvalidCollectionHierarchy(
                "AdHocGroup must be the child of a Classroom"
            )
        super(AdHocGroup, self).save(*args, **kwargs)

    def get_classroom(self):
        """
        Gets the ``AdHocGroup``'s parent ``Classroom``.

        :return: A ``Classroom`` instance.
        """
        return Classroom.objects.get(id=self.parent_id)

    def add_learner(self, user):
        return self.add_member(user)

    def add_learners(self, users):
        return [self.add_learner(user) for user in users]

    def get_learners(self):
        return FacilityUser.objects.filter(memberships__collection=self)

    def remove_learner(self, user):
        return self.remove_member(user)

    def __str__(self):
        return self.name
