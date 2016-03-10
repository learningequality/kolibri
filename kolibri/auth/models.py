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

import uuid

from django.contrib.auth.models import AbstractBaseUser
from django.core import validators
from django.core.exceptions import ValidationError
from django.db import models
from django.db.utils import IntegrityError
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from kolibri.core.errors import KolibriError
from mptt.managers import TreeManager
from mptt.models import MPTTModel, TreeForeignKey


class KolibriValidationError(KolibriError):
    pass


##############################################
# MORANGO: These pieces will live in Morango, but dummies/stubs are temporarily included here until Morango is ready.
##############################################

class UUIDField(models.CharField):

    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 32
        self.random = kwargs.pop("random", False)
        super(UUIDField, self).__init__(*args, **kwargs)

    def get_default(self):
        if self.random:
            return uuid.uuid4().hex
        else:
            return super(UUIDField, self).get_default()


class MorangoError(Exception):
    pass


class SyncableModelPartitionQuerySet(models.QuerySet):

    def filter_by_partition(self, **kwargs):

        query = {}

        # if attempting to filter on a nonexistent partition, throw an error
        nonexistent_partitions = set(kwargs.keys()) - set(self.model._morango_partition_fields.keys())
        if nonexistent_partitions:
            raise MorangoError(
                "Cannot filter model '{model}' on nonexistent partitions '{partitions}'.".format(
                    model=self.model.__name__,
                    partitions=nonexistent_partitions
                )
            )

        # for each of the provided arguments, add a filter query parameter mapped to the appropriate model field
        for key, val in kwargs.items():

            field_name = self.model._morango_partition_fields[key]

            # if attempting to filter on a partition for which the current model has no field, there are no matches
            if not hasattr(self.model, field_name):
                return self.none()

            query[field_name] = val

        # apply the calculated filter to the queryset
        return self.filter(**query)


class SyncableModel(models.Model):

    _morango_partition_fields = {}  # maps from a partition name to a model field name

    objects = SyncableModelPartitionQuerySet.as_manager()
    # special reference to partition manager in case 'objects' is overridden in subclasses:
    partitioned_objects = SyncableModelPartitionQuerySet.as_manager()

    id = UUIDField(primary_key=True)

    class Meta:
        abstract = True

    def calculate_uuid(self):
        return uuid.uuid4().hex  # for now, in this dummy stub, we're just using random UUIDs

    def get_partition(self):
        """
        Calculate and return the partition attributes for the current model instance.
        """
        partition = {}
        for partition_name, field_name in self._morango_partition_fields.items():
            if hasattr(self, field_name):
                partition[partition_name] = getattr(self, field_name)
        return partition

    def clean_fields(self):
        if not self.id:
            self.id = self.calculate_uuid()
        super(SyncableModel, self).clean_fields()


class MorangoTreeManager(TreeManager):

    # Override the logic in Django MPTT that assigns tree ids, as we need to ensure tree ids do not
    # conflict for facilities created on differentdevices and then later synced to the same device
    # By default, tree ids are auto-increasing integers, but we use UUIDs to avoid collisions.
    def _get_next_tree_id(self):
        return uuid.uuid4().hex


class MorangoMPTTModel(MPTTModel):
    """
    Any model that inherits from SyncableModel that wants to inherit from MPTTModel should instead inherit
    from MorangoMPTTModel, which modifies some behavior to make it safe for the syncing system.
    """

    _default_manager = MorangoTreeManager()

    # change tree_id to a uuid to avoid collisions; see explanation above in the MorangoTreeManager class
    tree_id = UUIDField()

    class Meta:
        abstract = True


class KolibriSyncableModel(SyncableModel):
    """
    Kolibri-specific subclass of Morango's SyncableModel class. Here, we add any additional fields needed
    for partitioning the data (in this case, the "dataset" attribute), and specify the list of attributes
    to be used for partitioning.
    """

    _morango_partition_fields = {
        "dataset": "dataset_id",
        "user": "user_id",
    }

    # in general, all syncable data must be associated with a FacilityDataset (but this can be overridden if needed)
    _require_dataset = True

    class Meta:
        abstract = True


##############################################
# /END MORANGO
##############################################


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

    class Meta:
        unique_together = (("username", "dataset"),)

    def is_device_owner(self):
        """
        For FacilityUsers, always False. Used in determining permissions.
        """
        return False

    def infer_dataset(self):
        # dataset must be provided when creating a FacilityUser
        return None


class DeviceOwner(KolibriAbstractBaseUser):
    """
    When a user first installs Kolibri on a device, they will be prompted to create a *DeviceOwner*, a special kind of
    user which is associated with that device only, and who must give permission to make broad changes to the Kolibri
    installation on that device (such as creating a Facility, or changing configuration settings).

    Actions not relating to user data but specifically to a device -- like upgrading Kolibri, changing whether the
    device is a Classroom Server or Classroom Client, or determining manually which data should be synced -- must be
    performed by a DeviceOwner.
    """

    def is_device_owner(self):
        """
        For DeviceOwners, always True. Used in determining permissions.
        """
        return True


class Collection(MorangoMPTTModel, AbstractFacilityDataModel):
    """
    Collections are hierarchical groups of users, used for grouping users and making decisions about permissions.
    Users belong to one or more Collections, by way of obtaining Roles associated with those Collections.
    Collections can belong to other Collections, and user membership in a collection is conferred by parenthood.
    Collections are subdivided into several pre-defined levels.

    The hierarchy of Roles and Collections forms a tree structure, and a description can be found
    `in the dev bible <https://docs.google.com/document/d/1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8/edit>`_.
    """

    KIND_FACILITY = "facility"
    KIND_CLASSROOM = "classroom"
    KIND_LEARNERGROUP = "learnergroup"

    # the ordering of kinds in the following tuple corresponds to their level in the hierarchy
    KINDS = (
        (KIND_FACILITY, _("Facility")),
        (KIND_CLASSROOM, _("Classroom")),
        (KIND_LEARNERGROUP, _("LearnerGroup")),
    )

    name = models.CharField(max_length=100)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    kind = models.CharField(max_length=20, choices=KINDS)

    def clean_fields(self):

        # enforce the Collection hierarchy of Facility > Classroom > LearnerGroup, by making sure that kind matches level
        if self.kind != self.KINDS[self.level][0]:
            raise ValidationError("Collections of kind '{kind}' cannot be at level {level} of the tree."
                                  .format(kind=self.kind, level=self.level))

        super(Collection, self).clean_fields()

    def add_user(self, user, role_kind):
        """
        Create a Role associating the provided user with this collection, with the specified kind of role.
        If the Role object already exists, just return that, without changing anything.

        :param user: The FacilityUser to associate with this Collection.
        :param role_kind: The kind of role to give the user with respect to this Collection.
        :return: The Role object (possibly new) that associates the user with the Collection.
        """

        # ensure the specified role kind is valid
        assert role_kind in (kind[0] for kind in Role.KINDS), \
            "'{role_kind}' is not a valid role kind.".format(role_kind=role_kind)

        # ensure the provided user is a FacilityUser
        assert isinstance(user, FacilityUser), "Only FacilityUsers can be associted with a collection."

        # create the necessary role, if it doesn't already exist
        role, created = Role.objects.get_or_create(user=user, collection=self, kind=role_kind, dataset=self.dataset)

        return role

    def remove_user(self, user, role_kind):
        """
        Remove any Role objects associating the provided user with this collection, with the specified kind of role.

        :param user: The FacilityUser to dissociate from this Collection (for the specific role kind).
        :param role_kind: The kind of role to remove from the user with respect to this Collection.
        """

        # ensure the specified role kind is valid
        assert role_kind in (kind[0] for kind in Role.KINDS), \
            "'{role_kind}' is not a valid role kind.".format(role_kind=role_kind)

        # ensure the provided user is a FacilityUser
        assert isinstance(user, FacilityUser), "Only FacilityUsers can be associted with a collection."

        # delete the appropriate role, if it exists
        Role.objects.filter(user=user, collection=self, kind=role_kind, dataset=self.dataset).delete()

    def add_admin(self, user):
        return self.add_user(user, Role.KIND_ADMIN)

    def add_coach(self, user):
        return self.add_user(user, Role.KIND_COACH)

    def add_learner(self, user):
        return self.add_user(user, Role.KIND_LEARNER)

    def add_admins(self, users):
        return [self.add_user(user, Role.KIND_ADMIN) for user in users]

    def add_coaches(self, users):
        return [self.add_user(user, Role.KIND_COACH) for user in users]

    def add_learners(self, users):
        return [self.add_user(user, Role.KIND_LEARNER) for user in users]

    def remove_admin(self, user):
        self.remove_user(user, Role.KIND_ADMIN)

    def remove_coach(self, user):
        self.remove_user(user, Role.KIND_COACH)

    def remove_learner(self, user):
        self.remove_user(user, Role.KIND_LEARNER)

    def infer_dataset(self):
        if self.is_root_node():
            return None  # the root node (Facility) must be explicitly tied to a dataset
        else:
            return self.get_root()  # subcollections inherit dataset from root of their tree


class Role(AbstractFacilityDataModel):
    """
    A User can be associated with a particular Collection through a Role object, which also stores the "kind"
    of the Role (currently, one of "admin", "coach", or "learner").
    """

    KIND_ADMIN = "admin"
    KIND_COACH = "coach"
    KIND_LEARNER = "learner"

    KINDS = (
        (KIND_ADMIN, _("Admin")),
        (KIND_COACH, _("Coach")),
        (KIND_LEARNER, _("Learner")),
    )

    user = models.ForeignKey('FacilityUser', blank=False, null=False)
    # Note: "It's recommended you use mptt.fields.TreeForeignKey wherever you have a foreign key to an MPTT model.
    # https://django-mptt.github.io/django-mptt/models.html#treeforeignkey-treeonetoonefield-treemanytomanyfield
    collection = TreeForeignKey("Collection")
    kind = models.CharField(max_length=20, choices=KINDS)

    class Meta:
        unique_together = (("user", "collection", "kind"),)

    def infer_dataset(self):
        user_dataset = self.user.infer_dataset()
        collection_dataset = self.collection.infer_dataset()
        assert user_dataset == collection_dataset
        return user_dataset


class FacilityManager(models.Manager):

    def get_queryset(self):
        return super(FacilityManager, self).get_queryset().filter(kind=Collection.KIND_FACILITY)


class Facility(Collection):

    objects = FacilityManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = Collection.KIND_FACILITY
        super(Facility, self).save(*args, **kwargs)

    def get_classrooms(self):
        """
        Returns a QuerySet of Classrooms under this Facility.

        :return: A Classroom QuerySet.
        """
        return Classroom.objects.filter(parent=self)


class ClassroomManager(models.Manager):

    def get_queryset(self):
        return super(ClassroomManager, self).get_queryset().filter(kind=Collection.KIND_CLASSROOM)


class Classroom(Collection):

    objects = ClassroomManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = Collection.KIND_CLASSROOM
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


class LearnerGroupManager(models.Manager):

    def get_queryset(self):
        return super(LearnerGroupManager, self).get_queryset().filter(kind=Collection.KIND_LEARNERGROUP)


class LearnerGroup(Collection):

    objects = LearnerGroupManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = Collection.KIND_LEARNERGROUP
        super(LearnerGroup, self).save(*args, **kwargs)

    def get_classroom(self):
        """
        Gets the LearnerGroup's parent Classroom.

        :return: A Classroom instance.
        """
        return Classroom.objects.get(id=self.parent_id)
