"""
We have three main abstractions: Users, Collections, and Roles.

Users represent people, like students in a school, teachers for a classroom, or volunteers setting up informal
installations. There are two main user types, FacilityUser and DeviceOwner. A FacilityUser belongs to a particular
facility, and has permissions only with respect to other data that is associated with that facility. A DeviceOwner
is not associated with a particular facility, and has global permissions for data on the local device. FacilityUser
accounts (like other facility data) may be synced across multiple devices, whereas a DeviceOwner account is specific
to a single installation of Kolibri.

Collections form a hierarchy, with Collections able to belong to other Collections. Collections are subdivided
into several pre-defined levels (Facility > Classroom > LearnerGroup).

A Role connects a FacilityUser and a Collection, for purposes of membership and permissions, along with a specified
"kind" (such as "admin", "coach", or "learner"). Users can have more than one Role. For instance, a User may have a
coach role for one Classroom, and an admin role for another.
"""

from __future__ import absolute_import, print_function, unicode_literals

from django.contrib.auth.models import AbstractBaseUser
from django.core import validators
from django.db import models
from django.db.utils import IntegrityError
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from kolibri.core.errors import KolibriValidationError
from mptt.models import MPTTModel, TreeForeignKey

from .constants import collection_kinds, role_kinds
from .errors import (
    InvalidRoleKind, UserDoesNotHaveRoleError,
    UserHasRoleOnlyIndirectlyThroughHierarchyError,
    UserIsMemberOnlyIndirectlyThroughHierarchyError, UserIsNotFacilityUser,
    UserIsNotMemberError
)


class FacilityDataset(models.Model):
    """
    FacilityDataset stores high-level metadata and settings for a particular facility. It is also the
    model that all models storing facility data (data that is associated with a particular facility, and that inherits
    from AbstractFacilityDataModel) foreign key onto, to indicate that they belong to this particular facility.
    """

    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    allow_signups = models.BooleanField(default=True)


class AbstractFacilityDataModel(models.Model):
    """
    Base model for Kolibri "Facility Data", which is data that is specific to a particular facility,
    such as FacilityUsers, Collections, and other data associated with those users and collections.
    """

    dataset = models.ForeignKey("FacilityDataset")

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
        inconsistencies, make sure it matches the inferred dataset, otherwise raise a KolibriValidationError.
        If we have no dataset and it can't be inferred, we raise a KolibriValidationError exception as well.
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
        It should be overridden in any subclass of AbstractFacilityDataModel, to define a model-specific inference.
        """
        raise NotImplementedError("Subclasses of AbstractFacilityDataModel must override the `infer_dataset` method.")


class KolibriAbstractBaseUser(AbstractBaseUser):
    """
    Our custom user type, derived from AbstractBaseUser as described in the Django docs.
    Draws liberally from django.contrib.auth.AbstractUser, except we exclude some fields
    we don't care about, like email.

    This model is an abstract model, and is inherited by both FacilityUser and DeviceOwner.
    """

    class Meta:
        abstract = True

    USERNAME_FIELD = "username"

    username = models.CharField(
        _('username'),
        max_length=30,
        help_text=_('Required. 30 characters or fewer. Letters and digits only.'),
        validators=[
            validators.RegexValidator(
                r'^\w+$',
                _('Enter a valid username. This value may contain only letters and numbers.')
            ),
        ],
    )
    first_name = models.CharField(_('first name'), max_length=60, blank=True)
    last_name = models.CharField(_('last name'), max_length=60, blank=True)
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now, editable=False)

    def is_device_owner(self):
        raise NotImplementedError("Subclasses of KolibriAbstractBaseUser must override the `is_device_owner` method.")

    def get_full_name(self):
        return (self.first_name + " " + self.last_name).strip()

    def get_short_name(self):
        return self.first_name


class FacilityUser(KolibriAbstractBaseUser, AbstractFacilityDataModel):
    """
    FacilityUsers are the fundamental object of the auth app. They represent the main users, and can be associated
    with a hierarchy of Collections through Roles, which then serve to determine permissions.
    """

    facility = models.ForeignKey("Facility")

    # FacilityUsers can't access the Django admin interface
    is_staff = False
    is_superuser = False

    class Meta:
        unique_together = (("username", "facility"),)

    def infer_dataset(self):
        return self.facility.dataset


class DeviceOwner(KolibriAbstractBaseUser):
    """
    When a user first installs Kolibri on a device, they will be prompted to create a *DeviceOwner*, a special kind of
    user which is associated with that device only, and who must give permission to make broad changes to the Kolibri
    installation on that device (such as creating a Facility, or changing configuration settings).

    Actions not relating to user data but specifically to a device -- like upgrading Kolibri, changing whether the
    device is a Classroom Server or Classroom Client, or determining manually which data should be synced -- must be
    performed by a DeviceOwner.
    """

    # DeviceOwners can access the Django admin interface
    is_staff = True
    is_superuser = True


class Collection(MPTTModel, AbstractFacilityDataModel):
    """
    Collections are hierarchical groups of users, used for grouping users and making decisions about permissions.
    Users belong to one or more Collections, by way of obtaining Roles associated with those Collections.
    Collections can belong to other Collections, and user membership in a collection is conferred by parenthood.
    Collections are subdivided into several pre-defined levels.

    The hierarchy of Collections forms a tree structure, and a description can be found
    `in the dev bible <https://docs.google.com/document/d/1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8/edit>`_.
    """

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
        Make sure the "kind" is set correctly on the model, corresponding to the appropriate subclass of Collection.
        """
        if self._KIND:
            self.kind = self._KIND

    def add_role(self, user, role_kind):
        """
        Create a Role associating the provided user with this collection, with the specified kind of role.
        If the Role object already exists, just return that, without changing anything.

        :param user: The FacilityUser to associate with this Collection.
        :param role_kind: The kind of role to give the user with respect to this Collection.
        :return: The Role object (possibly new) that associates the user with the Collection.
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
        Remove any Role objects associating the provided user with this collection, with the specified kind of role.

        :param user: The FacilityUser to dissociate from this Collection (for the specific role kind).
        :param role_kind: The kind of role to remove from the user with respect to this Collection.
        """

        # ensure the specified role kind is valid
        if role_kind not in (kind[0] for kind in role_kinds.choices):
            raise InvalidRoleKind("'{role_kind}' is not a valid role kind.".format(role_kind=role_kind))

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only remove roles for FacilityUsers.")

        # make sure the user has the role to begin with
        if not user.has_role_for(self):
            raise UserDoesNotHaveRoleError("User does not have this role for this collection.")

        # delete the appropriate role, if it exists
        results = Role.objects.filter(user=user, collection=self, kind=role_kind).delete()

        # if no Roles were deleted, the user's role must have been indirect (via the collection hierarchy)
        if results[0] == 0:
            raise UserHasRoleOnlyIndirectlyThroughHierarchyError(
                "Role cannot be removed, as user has it only indirectly, through the collection hierarchy.")

    def add_member(self, user):
        """
        Create a Membership associating the provided user with this collection.
        If the Membership object already exists, just return that, without changing anything.

        :param user: The FacilityUser to add to this Collection.
        :return: The Membership object (possibly new) that associates the user with the Collection.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only add memberships for FacilityUsers.")

        # create the necessary membership, if it doesn't already exist
        membership, created = Membership.objects.get_or_create(user=user, collection=self)

        return membership

    def remove_member(self, user):
        """
        Remove any Membership objects associating the provided user with this collection.

        :param user: The FacilityUser to remove from this Collection.
        :return: True if a Membership was removed, False if there was no matching Membership to remove.
        """

        # ensure the provided user is a FacilityUser
        if not isinstance(user, FacilityUser):
            raise UserIsNotFacilityUser("You can only remove memberships for FacilityUsers.")

        if not self.is_member(user):
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


class Membership(AbstractFacilityDataModel):
    """
    A User can be marked as a member of a Collection through a Membership object. Being a member of a Collection
    also means being a member of all the Collections above that Collection in the tree (i.e. if you are a member
    of a LearnerGroup, you are also a member of the Classroom that contains that LearnerGroup, and of the Facility
    that contains that Classroom).
    """

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


class Role(AbstractFacilityDataModel):
    """
    A User can have a role for a particular Collection through a Role object, which also stores the "kind"
    of the Role (currently, one of "admin" or "coach"). Having a role for a Collection also implies having that
    role for all sub-Collections of that Collection (i.e. all the Collections below it in the tree).
    """

    user = models.ForeignKey('FacilityUser', blank=False, null=False)
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


class CollectionProxyManager(models.Manager):

    def get_queryset(self):
        return super(CollectionProxyManager, self).get_queryset().filter(kind=self.model._KIND)


class Facility(Collection):

    _KIND = collection_kinds.FACILITY

    objects = CollectionProxyManager()

    class Meta:
        proxy = True

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
        Gets the Classroom's parent Facility.

        :return: A Facility instance.
        """
        return Facility.objects.get(id=self.parent_id)

    def get_learner_groups(self):
        """
        Returns a QuerySet of LearnerGroups associated with this Classroom.

        :return: A LearnerGroup QuerySet.
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
        Gets the LearnerGroup's parent Classroom.

        :return: A Classroom instance.
        """
        return Classroom.objects.get(id=self.parent_id)

    def add_learner(self, user):
        return self.add_member(user)

    def add_learners(self, users):
        return [self.add_learner(user) for user in users]

    def remove_learner(self, user):
        return self.remove_member(user)
