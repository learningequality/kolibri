"""
We have four main abstractions: Users, Collections, Memberships, and Roles.

Users represent people, like students in a school, teachers for a classroom, or volunteers setting up informal
installations. There are two main user types, ``FacilityUser`` and ``DeviceOwner``. A ``FacilityUser`` belongs to a
particular facility, and has permissions only with respect to other data that is associated with that facility. A
``DeviceOwner`` is not associated with a particular facility, and has global permissions for data on the local device.
``FacilityUser`` accounts (like other facility data) may be synced across multiple devices, whereas a DeviceOwner account
is specific to a single installation of Kolibri.

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

from __future__ import absolute_import, print_function, unicode_literals

import logging as logger

from django.contrib.auth.models import AbstractBaseUser, AnonymousUser
from django.core import validators
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.query import F
from django.db.utils import IntegrityError
from django.utils import timezone
from django.utils.encoding import python_2_unicode_compatible
from django.utils.translation import ugettext_lazy as _
from kolibri.core.errors import KolibriValidationError
from mptt.models import MPTTModel, TreeForeignKey
from six import string_types

from .constants import collection_kinds, role_kinds
from .errors import (
    InvalidRoleKind, UserDoesNotHaveRoleError, UserHasRoleOnlyIndirectlyThroughHierarchyError, UserIsMemberOnlyIndirectlyThroughHierarchyError,
    UserIsNotFacilityUser, UserIsNotMemberError
)
from .filters import HierarchyRelationsFilter
from .permissions.auth import (
    AnybodyCanCreateIfNoDeviceOwner, AnybodyCanCreateIfNoFacility, CollectionSpecificRoleBasedPermissions,
    AnonUserCanReadFacilitiesThatAllowSignUps, IsAdminForOwnFacilityDataset
)
from .permissions.base import BasePermissions, RoleBasedPermissions
from .permissions.general import IsAdminForOwnFacility, IsFromSameFacility, IsOwn, IsSelf

logging = logger.getLogger(__name__)


def _has_permissions_class(obj):
    return hasattr(obj, "permissions") and isinstance(obj.permissions, BasePermissions)


@python_2_unicode_compatible
class FacilityDataset(models.Model):
    """
    ``FacilityDataset`` stores high-level metadata and settings for a particular ``Facility``. It is also the
    model that all models storing facility data (data that is associated with a particular facility, and that inherits
    from ``AbstractFacilityDataModel``) foreign key onto, to indicate that they belong to this particular ``Facility``.
    """

    permissions = IsAdminForOwnFacilityDataset()

    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    # Facility specific configuration settings
    learner_can_edit_username = models.BooleanField(default=False)
    learner_can_edit_name = models.BooleanField(default=False)
    learner_can_edit_password = models.BooleanField(default=False)
    learner_can_sign_up = models.BooleanField(default=False)
    learner_can_delete_account = models.BooleanField(default=False)

    def __str__(self):
        facilities = self.collection_set.filter(kind=collection_kinds.FACILITY)
        if facilities:
            return "FacilityDataset for {}".format(Facility.objects.get(id=facilities[0].id))
        else:
            return "FacilityDataset (no associated Facility)"


class AbstractFacilityDataModel(models.Model):
    """
    Base model for Kolibri "Facility Data", which is data that is specific to a particular ``Facility``,
    such as ``FacilityUsers``, ``Collections``, and other data associated with those users and collections.
    """

    dataset = models.ForeignKey(FacilityDataset)

    class Meta:
        abstract = True

    def clean_fields(self, *args, **kwargs):
        # ensure that we have, or can infer, a dataset for the model instance
        self.ensure_dataset()
        super(AbstractFacilityDataModel, self).clean_fields(*args, **kwargs)

    def save(self, *args, **kwargs):

        # before saving, ensure we have a dataset, and convert any validation errors into integrity errors,
        # since by this point the `clean_fields` method should already have prevented this situation from arising
        try:
            self.ensure_dataset()
        except KolibriValidationError as e:
            raise IntegrityError(str(e))

        super(AbstractFacilityDataModel, self).save(*args, **kwargs)

    def ensure_dataset(self):
        """
        If no dataset has yet been specified, try to infer it. If a dataset has already been specified, to prevent
        inconsistencies, make sure it matches the inferred dataset, otherwise raise a ``KolibriValidationError``.
        If we have no dataset and it can't be inferred, we raise a ``KolibriValidationError`` exception as well.
        """
        inferred_dataset = self.infer_dataset()
        if self.dataset_id:
            # make sure currently stored dataset matches inferred dataset, if any
            if inferred_dataset and inferred_dataset != self.dataset:
                raise KolibriValidationError("This model is not associated with the correct FacilityDataset.")
        else:
            # use the inferred dataset, if there is one, otherwise throw an error
            if inferred_dataset:
                self.dataset = inferred_dataset
            else:
                raise KolibriValidationError("FacilityDataset ('dataset') not provided, and could not be inferred.")

    def infer_dataset(self):
        """
        This method is used by `ensure_dataset` to "infer" which dataset should be associated with this instance.
        It should be overridden in any subclass of ``AbstractFacilityDataModel``, to define a model-specific inference.
        """
        raise NotImplementedError("Subclasses of AbstractFacilityDataModel must override the `infer_dataset` method.")


class KolibriAbstractBaseUser(AbstractBaseUser):
    """
    Our custom user type, derived from ``AbstractBaseUser`` as described in the Django docs.
    Draws liberally from ``django.contrib.auth.AbstractUser``, except we exclude some fields
    we don't care about, like email.

    This model is an abstract model, and is inherited by both ``FacilityUser`` and ``DeviceOwner``.
    """

    class Meta:
        abstract = True

    USERNAME_FIELD = "username"

    username = models.CharField(
        _('username'),
        max_length=30,
        help_text=_('Required. 30 characters or fewer. Letters and digits only'),
        validators=[
            validators.RegexValidator(
                r'^\w+$',
                _('Enter a valid username. This value may contain only letters and numbers.')
            ),
        ],
    )
    full_name = models.CharField(_('full name'), max_length=120, blank=True)
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now, editable=False)

    def get_short_name(self):
        return self.full_name.split(' ', 1)[0]

    def is_member_of(self, coll):
        """
        Determine whether this user is a member of the specified ``Collection``.

        :param coll: The ``Collection`` for which we are checking this user's membership.
        :return: ``True`` if this user is a member of the specified ``Collection``, otherwise False.
        :rtype: bool
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `is_member_of` method.")

    def get_roles_for_user(self, user):
        """
        Determine all the roles this user has in relation to the target user, and return a set containing the kinds of roles.

        :param user: The target user for which this user has the roles.
        :return: The kinds of roles this user has with respect to the target user.
        :rtype: set of ``kolibri.auth.constants.role_kinds.*`` strings
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `get_roles_for_user` method.")

    def get_roles_for_collection(self, coll):
        """
        Determine all the roles this user has in relation to the specified ``Collection``, and return a set containing the kinds of roles.

        :param coll: The target ``Collection`` for which this user has the roles.
        :return: The kinds of roles this user has with respect to the specified ``Collection``.
        :rtype: set of ``kolibri.auth.constants.role_kinds.*`` strings
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `get_roles_for_collection` method.")

    def has_role_for_user(self, kinds, user):
        """
        Determine whether this user has (at least one of) the specified role kind(s) in relation to the specified user.

        :param user: The user that is the target of the role (for which this user has the roles).
        :param kinds: The kind (or kinds) of role to check for, as a string or iterable.
        :type kinds: string from ``kolibri.auth.constants.role_kinds.*``
        :return: ``True`` if this user has the specified role kind with respect to the target user, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `has_role_for_user` method.")

    def has_role_for_collection(self, kinds, coll):
        """
        Determine whether this user has (at least one of) the specified role kind(s) in relation to the specified ``Collection``.

        :param kinds: The kind (or kinds) of role to check for, as a string or iterable.
        :type kinds: string from kolibri.auth.constants.role_kinds.*
        :param coll: The target ``Collection`` for which this user has the roles.
        :return: ``True`` if this user has the specified role kind with respect to the target ``Collection``, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `has_role_for_collection` method.")

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
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `can_create_instance` method.")

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
            instance.clean_fields()
            instance.clean()
        except TypeError as e:
            logging.error("TypeError while validating model before checking permissions: {}".format(e.args))
            return False  # if the data provided does not fit the Model, don't continue checking
        except ValidationError as e:
            logging.error("ValidationError while validating model before checking permissions: {}".format(e.args))
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
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `can_read` method.")

    def can_update(self, obj):
        """
        Checks whether this user (self) has permission to update a particular model instance (obj).

        This method should be overridden by classes that inherit from KolibriAbstractBaseUser.

        :param obj: An instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to update the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `can_update` method.")

    def can_delete(self, obj):
        """
        Checks whether this user (self) has permission to delete a particular model instance (obj).

        This method should be overridden by classes that inherit from KolibriAbstractBaseUser.

        :param obj: An instance of a Django model, to check permissions for.
        :return: ``True`` if this user should have permission to delete the object, otherwise ``False``.
        :rtype: bool
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `can_delete` method.")

    def get_roles_for(self, obj):
        """
        Helper function that defers to ``get_roles_for_user`` or ``get_roles_for_collection`` based on the type of object passed in.
        """
        if isinstance(obj, KolibriAbstractBaseUser):
            return self.get_roles_for_user(obj)
        elif isinstance(obj, Collection):
            return self.get_roles_for_collection(obj)
        else:
            raise ValueError("The `obj` argument to `get_roles_for` must be either an instance of KolibriAbstractBaseUser or Collection.")

    def has_role_for(self, kinds, obj):
        """
        Helper function that defers to ``has_role_for_user`` or ``has_role_for_collection`` based on the type of object passed in.
        """
        if isinstance(obj, KolibriAbstractBaseUser):
            return self.has_role_for_user(kinds, obj)
        elif isinstance(obj, Collection):
            return self.has_role_for_collection(kinds, obj)
        else:
            raise ValueError("The `obj` argument to `has_role_for` must be either an instance of KolibriAbstractBaseUser or Collection.")

    def filter_readable(self, queryset):
        """
        Filters a queryset down to only the elements that this user should have permission to read.

        :param queryset: A ``QuerySet`` instance that the filtering should be applied to.
        :return: Filtered ``QuerySet`` including only elements that are readable by this user.
        """
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `can_delete` method.")


class KolibriAnonymousUser(AnonymousUser, KolibriAbstractBaseUser):
    """
    Custom anonymous user that also exposes the same interface as KolibriAbstractBaseUser, for consistency.
    """

    class Meta:
        abstract = True

    def is_member_of(self, coll):
        return False

    def get_roles_for_user(self, user):
        return set([])

    def get_roles_for_collection(self, coll):
        return set([])

    def has_role_for_user(self, kinds, user):
        return False

    def has_role_for_collection(self, kinds, coll):
        return False

    def can_create_instance(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_create_object(self, obj)
        else:
            return False

    def can_read(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_read_object(self, obj)
        else:
            return False

    def can_update(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_update_object(self, obj)
        else:
            return False

    def can_delete(self, obj):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(obj):
            return obj.permissions.user_can_delete_object(self, obj)
        else:
            return False

    def filter_readable(self, queryset):
        # check the object permissions, if available, just in case permissions are granted to anon users
        if _has_permissions_class(queryset.model):
            return queryset.model.permissions.readable_by_user_filter(self, queryset).distinct()
        else:
            return queryset.none()


@python_2_unicode_compatible
class FacilityUser(KolibriAbstractBaseUser, AbstractFacilityDataModel):
    """
    ``FacilityUser`` is the fundamental object of the auth app. These users represent the main users, and can be associated
    with a hierarchy of ``Collections`` through ``Memberships`` and ``Roles``, which then serve to help determine permissions.
    """

    permissions = (
        IsSelf() |  # FacilityUser can be read and written by itself
        IsAdminForOwnFacility() |  # FacilityUser can be read and written by a facility admin
        RoleBasedPermissions(  # FacilityUser can be read by admin or coach, and updated by admin, but not created/deleted by non-facility admin
            target_field=".",
            can_be_created_by=(),  # we can't check creation permissions by role, as user doesn't exist yet
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(role_kinds.ADMIN,),
            can_be_deleted_by=(),  # don't want a classroom admin deleting a user completely, just removing them from the class
        )
    )

    facility = models.ForeignKey("Facility")

    # FacilityUsers can't access the Django admin interface
    is_staff = False
    is_superuser = False

    class Meta:
        unique_together = (("username", "facility"),)

    def infer_dataset(self):
        return self.facility.dataset

    def is_member_of(self, coll):
        if self.dataset_id != coll.dataset_id:
            return False
        if coll.kind == collection_kinds.FACILITY:
            return True  # FacilityUser is always a member of her own facility
        return HierarchyRelationsFilter(FacilityUser.objects.all()).filter_by_hierarchy(
            target_user=F("id"),
            ancestor_collection=coll.id,
        ).filter(id=self.id).exists()

    def get_roles_for_user(self, user):
        if not hasattr(user, "dataset_id") or self.dataset_id != user.dataset_id:
            return set([])
        role_instances = HierarchyRelationsFilter(Role).filter_by_hierarchy(
            ancestor_collection=F("collection"),
            source_user=F("user"),
            target_user=user,
        ).filter(user=self)
        return set([instance["kind"] for instance in role_instances.values("kind").distinct()])

    def get_roles_for_collection(self, coll):
        if self.dataset_id != coll.dataset_id:
            return set([])
        role_instances = HierarchyRelationsFilter(Role).filter_by_hierarchy(
            ancestor_collection=F("collection"),
            source_user=F("user"),
            descendant_collection=coll,
        ).filter(user=self)
        return set([instance["kind"] for instance in role_instances.values("kind").distinct()])

    def has_role_for_user(self, kinds, user):
        if not kinds:
            return False
        if not hasattr(user, "dataset_id") or self.dataset_id != user.dataset_id:
            return False
        return HierarchyRelationsFilter(Role).filter_by_hierarchy(
            ancestor_collection=F("collection"),
            source_user=F("user"),
            role_kind=kinds,
            target_user=user,
        ).filter(user=self).exists()

    def has_role_for_collection(self, kinds, coll):
        if not kinds:
            return False
        if self.dataset_id != coll.dataset_id:
            return False
        return HierarchyRelationsFilter(Role).filter_by_hierarchy(
            ancestor_collection=F("collection"),
            source_user=F("user"),
            role_kind=kinds,
            descendant_collection=coll,
        ).filter(user=self).exists()

    def can_create_instance(self, obj):
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_create_object(self, obj)
        else:
            return False

    def can_read(self, obj):
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_read_object(self, obj)
        else:
            return False

    def can_update(self, obj):
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_update_object(self, obj)
        else:
            return False

    def can_delete(self, obj):
        # a FacilityUser's permissions are determined through the object's permission class
        if _has_permissions_class(obj):
            return obj.permissions.user_can_delete_object(self, obj)
        else:
            return False

    def filter_readable(self, queryset):
        if _has_permissions_class(queryset.model):
            return queryset.model.permissions.readable_by_user_filter(self, queryset).distinct()
        else:
            return queryset.none()

    def __str__(self):
        return '"{user}"@"{facility}"'.format(user=self.full_name or self.username, facility=self.facility)


class DeviceOwnerManager(models.Manager):

    def create_superuser(self, username, password, **extra_fields):
        if not username:
            raise ValueError('The given username must be set')
        user = DeviceOwner(username=username)
        user.set_password(password)
        user.save()
        return user


@python_2_unicode_compatible
class DeviceOwner(KolibriAbstractBaseUser):
    """
    When a user first installs Kolibri on a device, they will be prompted to create a ``DeviceOwner``, a special kind of
    user which is associated with that device only, and who must give permission to make broad changes to the Kolibri
    installation on that device (such as creating a ``Facility``, or changing configuration settings).

    Actions not relating to user data but specifically to a device -- like upgrading Kolibri, changing whether the
    device is a Classroom Server or Classroom Client, or determining manually which data should be synced -- must be
    performed by a ``DeviceOwner``.

    A ``DeviceOwner`` is a superuser, and has full access to do anything she wants with data on the device.
    """
    permissions = AnybodyCanCreateIfNoDeviceOwner()
    objects = DeviceOwnerManager()

    # DeviceOwners can access the Django admin interface
    is_staff = True
    is_superuser = True

    def is_member_of(self, coll):
        return False  # a DeviceOwner is not a member of any Collection

    def get_roles_for_user(self, user):
        return set([role_kinds.ADMIN])  # a DeviceOwner has admin role for all users on the device

    def get_roles_for_collection(self, coll):
        return set([role_kinds.ADMIN])  # a DeviceOwner has admin role for all collections on the device

    def has_role_for_user(self, kinds, user):
        if isinstance(kinds, string_types):
            kinds = [kinds]
        return role_kinds.ADMIN in kinds  # a DeviceOwner has admin role for all users on the device

    def has_role_for_collection(self, kinds, coll):
        if isinstance(kinds, string_types):
            kinds = [kinds]
        return role_kinds.ADMIN in kinds  # a DeviceOwner has admin role for all collections on the device

    def can_create_instance(self, obj):
        # DeviceOwners are superusers, and can do anything
        return True

    def can_read(self, obj):
        # DeviceOwners are superusers, and can do anything
        return True

    def can_update(self, obj):
        # DeviceOwners are superusers, and can do anything
        return True

    def can_delete(self, obj):
        # DeviceOwners are superusers, and can do anything
        return True

    def filter_readable(self, queryset):
        return queryset

    def __str__(self):
        return self.full_name or self.username

    def has_perm(self, perm, obj=None):
        # ensure the DeviceOwner has full access to the Django admin
        return True

    def has_perms(self, perm_list, obj=None):
        # ensure the DeviceOwner has full access to the Django admin
        return True

    def has_module_perms(self, app_label):
        # ensure the DeviceOwner has full access to the Django admin
        return True


@python_2_unicode_compatible
class Collection(MPTTModel, AbstractFacilityDataModel):
    """
    ``Collections`` are hierarchical groups of ``FacilityUsers``, used for grouping users and making decisions about permissions.
    ``FacilityUsers`` can have roles for one or more ``Collections``, by way of obtaining ``Roles`` associated with those ``Collections``.
    ``Collections`` can belong to other ``Collections``, and user membership in a ``Collection`` is conferred through ``Memberships``.
    ``Collections`` are subdivided into several pre-defined levels.
    """

    # Collection can be read by anybody from the facility; writing is only allowed by an admin for the collection.
    # Furthermore, no FacilityUser can create or delete a Facility. Permission to create a collection is governed
    # by roles in relation to the new collection's parent collection (see CollectionSpecificRoleBasedPermissions).
    permissions = (
        IsFromSameFacility(read_only=True) |
        CollectionSpecificRoleBasedPermissions() |
        AnybodyCanCreateIfNoFacility() |
        AnonUserCanReadFacilitiesThatAllowSignUps()
    )

    _KIND = None  # Should be overridden in subclasses to specify what "kind" they are

    name = models.CharField(max_length=100)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    kind = models.CharField(max_length=20, choices=collection_kinds.choices)

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
            return FacilityUser.objects.filter(dataset=self.dataset)  # FacilityUser is always a member of her own facility
        return HierarchyRelationsFilter(FacilityUser).filter_by_hierarchy(
            target_user=F("id"),
            ancestor_collection=self,
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
        if role_kind not in (kind[0] for kind in role_kinds.choices):
            raise InvalidRoleKind("'{role_kind}' is not a valid role kind.".format(role_kind=role_kind))

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only add roles for FacilityUsers.")

        # create the necessary role, if it doesn't already exist
        role, created = Role.objects.get_or_create(user=user, collection=self, kind=role_kind)

        return role

    def remove_role(self, user, role_kind):
        """
        Remove any ``Role`` objects associating the provided user with this ``Collection``, with the specified kind of role.

        :param user: The ``FacilityUser`` to dissociate from this ``Collection`` (for the specific role kind).
        :param role_kind: The kind of role to remove from the user with respect to this ``Collection``.
        """

        # ensure the specified role kind is valid
        if role_kind not in (kind[0] for kind in role_kinds.choices):
            raise InvalidRoleKind("'{role_kind}' is not a valid role kind.".format(role_kind=role_kind))

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only remove roles for FacilityUsers.")

        # make sure the user has the role to begin with
        if not user.has_role_for_collection(role_kind, self):
            raise UserDoesNotHaveRoleError("User does not have this role for this collection.")

        # delete the appropriate role, if it exists
        results = Role.objects.filter(user=user, collection=self, kind=role_kind).delete()

        # if no Roles were deleted, the user's role must have been indirect (via the collection hierarchy)
        if results[0] == 0:
            raise UserHasRoleOnlyIndirectlyThroughHierarchyError(
                "Role cannot be removed, as user has it only indirectly, through the collection hierarchy.")

    def add_member(self, user):
        """
        Create a ``Membership`` associating the provided user with this ``Collection``.
        If the ``Membership`` object already exists, just return that, without changing anything.

        :param user: The ``FacilityUser`` to add to this ``Collection``.
        :return: The ``Membership`` object (possibly new) that associates the user with the ``Collection``.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only add memberships for FacilityUsers.")

        # create the necessary membership, if it doesn't already exist
        membership, created = Membership.objects.get_or_create(user=user, collection=self)

        return membership

    def remove_member(self, user):
        """
        Remove any ``Membership`` objects associating the provided user with this ``Collection``.

        :param user: The ``FacilityUser`` to remove from this ``Collection``.
        :return: ``True`` if a ``Membership`` was removed, ``False`` if there was no matching ``Membership`` to remove.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only remove memberships for FacilityUsers.")

        if not user.is_member_of(self):
            raise UserIsNotMemberError("The user is not a member of the collection, and cannot be removed.")

        # delete the appropriate membership, if it exists
        results = Membership.objects.filter(user=user, collection=self).delete()

        # if no Memberships were deleted, the user's membership must have been indirect (via the collection hierarchy)
        if results[0] == 0:
            raise UserIsMemberOnlyIndirectlyThroughHierarchyError(
                "Membership cannot be removed, as user is a member only indirectly, through the collection hierarchy.")

    def infer_dataset(self):
        if self.parent:
            # subcollections inherit dataset from root of their tree
            # (we can't call `get_root` directly on self, as it won't work if self hasn't yet been saved)
            return self.parent.get_root().dataset
        else:
            return None  # the root node (i.e. Facility) must be explicitly tied to a dataset

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

    permissions = (
        IsOwn(read_only=True) |  # users can read their own Memberships
        RoleBasedPermissions(  # Memberships can be read and written by admins, and read by coaches, for the member user
            target_field="user",
            can_be_created_by=(role_kinds.ADMIN,),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(),  # Membership objects shouldn't be updated; they should be deleted and recreated as needed
            can_be_deleted_by=(role_kinds.ADMIN,),
        )
    )

    user = models.ForeignKey('FacilityUser', blank=False, null=False)
    # Note: "It's recommended you use mptt.fields.TreeForeignKey wherever you have a foreign key to an MPTT model.
    # https://django-mptt.github.io/django-mptt/models.html#treeforeignkey-treeonetoonefield-treemanytomanyfield
    collection = TreeForeignKey("Collection")

    class Meta:
        unique_together = (("user", "collection"),)

    def infer_dataset(self):
        user_dataset = self.user.dataset
        collection_dataset = self.collection.dataset
        if user_dataset != collection_dataset:
            raise KolibriValidationError("Collection and user for a Membership object must be in same dataset.")
        return user_dataset

    def __str__(self):
        return "{user}'s membership in {collection}".format(user=self.user, collection=self.collection)

@python_2_unicode_compatible
class Role(AbstractFacilityDataModel):
    """
    A ``FacilityUser`` can have a role for a particular ``Collection`` through a ``Role`` object, which also stores
    the "kind" of the ``Role`` (currently, one of "admin" or "coach"). Having a role for a ``Collection`` also
    implies having that role for all sub-collections of that ``Collection`` (i.e. all the ``Collections`` below it
    in the tree).
    """

    permissions = (
        IsOwn(read_only=True) |  # users can read their own Roles
        RoleBasedPermissions(  # Memberships can be read and written by admins, and read by coaches, for the role collection
            target_field="collection",
            can_be_created_by=(role_kinds.ADMIN,),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(),  # Role objects shouldn't be updated; they should be deleted and recreated as needed
            can_be_deleted_by=(role_kinds.ADMIN,),
        )
    )

    user = models.ForeignKey('FacilityUser', related_name="roles", blank=False, null=False)
    # Note: "It's recommended you use mptt.fields.TreeForeignKey wherever you have a foreign key to an MPTT model.
    # https://django-mptt.github.io/django-mptt/models.html#treeforeignkey-treeonetoonefield-treemanytomanyfield
    collection = TreeForeignKey("Collection")
    kind = models.CharField(max_length=20, choices=role_kinds.choices)

    class Meta:
        unique_together = (("user", "collection", "kind"),)

    def infer_dataset(self):
        user_dataset = self.user.dataset
        collection_dataset = self.collection.dataset
        if user_dataset != collection_dataset:
            raise KolibriValidationError("The collection and user for a Role object must be in the same dataset.")
        return user_dataset

    def __str__(self):
        return "{user}'s {kind} role for {collection}".format(user=self.user, kind=self.kind, collection=self.collection)


class CollectionProxyManager(models.Manager):

    def get_queryset(self):
        return super(CollectionProxyManager, self).get_queryset().filter(kind=self.model._KIND)


@python_2_unicode_compatible
class Facility(Collection):

    _KIND = collection_kinds.FACILITY

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    @classmethod
    def get_default_facility(cls):
        # temporary approach to a default facility; later, we can make this more refined
        return cls.objects.all().first()

    def save(self, *args, **kwargs):
        if self.parent:
            raise IntegrityError("Facility must be the root of a collection tree, and cannot have a parent.")
        super(Facility, self).save(*args, **kwargs)

    def infer_dataset(self):
        # if we don't yet have a dataset, create a new one for this facility
        if not self.dataset_id:
            self.dataset = FacilityDataset.objects.create()
        return self.dataset

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

    _KIND = collection_kinds.CLASSROOM

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        if not self.parent:
            raise IntegrityError("Classroom cannot be the root of a collection tree, and must have a parent.")
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

    _KIND = collection_kinds.LEARNERGROUP

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        if not self.parent:
            raise IntegrityError("LearnerGroup cannot be the root of a collection tree, and must have a parent.")
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
