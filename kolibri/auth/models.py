"""
We have three main abstractions: Users, Collections, and Roles. Users represent people, like students in a school,
teachers for a classroom, or volunteers setting up informal installations.

Collections are hierarchical groups of users. Users belong to one or more Collections, and Collections can belong to
other Collections. Collections are subdivided into several pre-defined levels.

Roles belong to collections, and represent permissions. Users have one or more Roles. For instance, Classes (a type
of Collection) have an associated Coach Role -- that Coach has permission to view related User data for Users in the
Class.
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.contrib.auth.models import AbstractBaseUser
from django.core import validators
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone
from mptt.models import TreeForeignKey, MPTTModel

from kolibri.core.errors import KolibriError


class KolibriValidationError(KolibriError):
    pass


class BaseUser(AbstractBaseUser):
    """
    Our custom user type, derived from AbstractBaseUser as described in the Django docs.
    Draws liberally from django.contrib.auth.AbstractUser, except we remove some fields we don't care about, like
    email. Encapsulates both FacilityUsers and DeviceOwners, which are proxy models.

    Do not use this class directly.
    """
    username = models.CharField(
        _('username'),
        max_length=30,
        unique=True,
        help_text=_('Required. 30 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[
            validators.RegexValidator(
                r'^[\w.@+-]+$',
                _('Enter a valid username. This value may contain only '
                  'letters, numbers ' 'and @/./+/-/_ characters.')
            ),
        ],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    first_name = models.CharField(_('first name'), max_length=30, blank=True)
    last_name = models.CharField(_('last name'), max_length=30, blank=True)
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    # A "private" field -- used to check whether the given user is a device owner when we can't deal with the proxy
    # models directly
    _is_device_owner = models.BooleanField(default=None, blank=False, editable=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['_is_device_owner']

    def is_device_owner(self):
        """ Abstract method. Used in authentication backends. """
        raise NotImplementedError()

    def get_full_name(self):
        return self.first_name + " " + self.last_name

    def get_short_name(self):
        return self.first_name


class FacilityUserManager(models.Manager):
    def get_queryset(self):
        return super(FacilityUserManager, self).get_queryset().filter(_is_device_owner=False)


class FacilityUser(BaseUser):
    """
    FacilityUsers are the fundamental object of the auth app. They represent the main users, and belong to a
    hierarchy of Collections and Roles, which determine permissions.
    """
    objects = FacilityUserManager()

    class Meta:
        proxy = True

    def is_device_owner(self):
        """ For FacilityUsers, always False. Used in determining permissions. """
        return False

    def save(self, *args, **kwargs):
        if self._is_device_owner is None:
            self._is_device_owner = False
        elif self._is_device_owner:
            raise KolibriValidationError("FacilityUser objects *must* have _is_device_owner set to False!")
        return super(FacilityUser, self).save(*args, **kwargs)


class DeviceOwnerManager(models.Manager):
    def get_queryset(self):
        return super(DeviceOwnerManager, self).get_queryset().filter(_is_device_owner=True)


class DeviceOwner(BaseUser):
    """
    When a user first installs Kolibri on a device, they will be prompted to create a *DeviceOwner*, a special kind of
    user which is associated with that device only, and who must give permission to make broad changes to the Kolibri
    installation on that device (such as creating a Facility, or changing configuration settings).

    Actions not relating to user data but specifically to a device, like upgrading Kolibri, changing whether the
    device is a Classroom Server or Classroom Client, or determining manually which data should be synced must be
    performed by a DeviceOwner.
    """
    objects = DeviceOwnerManager()

    class Meta:
        proxy = True

    def is_device_owner(self):
        """ For DeviceOwners, always True. Used in determining permissions. """
        return True

    def save(self, *args, **kwargs):
        if self._is_device_owner is None:
            self._is_device_owner = True
        elif not self._is_device_owner:
            raise KolibriValidationError("DeviceOwner objects *must* have _is_device_owner set to True!")
        return super(DeviceOwner, self).save(*args, **kwargs)


class HierarchyNode(MPTTModel):
    """
    Model representing a node in the hierarchy of Collections and Roles. This hierarchy forms a tree.
    See `discussion in this repo <https://github.com/MCGallaspy/class_tree_proof>`_.

    Should not be used directly, as this is an implementation detail.

    The `kind` field is used to differentiate between nodes belonging to Collections and Roles, since it can't
    necessarily be discerned from the order as with the "natural" tree.

    The `kind_id` field is an intentionally denormalized reference to user ids, for efficient querying without table
    joins. For nodes with `kind` Role, it holds the value `Role.user.id`. Otherwise it's NULL.
    """
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    kind = models.CharField(max_length=50, blank=False, null=False, db_index=False)
    kind_id = models.IntegerField(blank=True, null=True, db_index=False)

    class Meta:
        """
        We know from prototyping that kind and kind_id will only be filtered on together, so we can achieve a constant
        improvement by indexing them together.
        """
        index_together = [
            ['kind', 'kind_id'],
        ]

    def insert_collection_node(self, node):
        """
        Inserts a "Collection" type node below itself.
        Really it just inserts a child node, but when a different tree structure was under consideration, it was less
        trivial. Reserved to make future changes.

        :param node: A HierarchyNode instance.
        :return: The calling node.
        """
        self._insert_child(node)
        return self

    def insert_role_node(self, node):
        """
        Inserts a "Role" type node below itself.
        Really it just inserts a child node, but when a different tree structure was under consideration, it was less
        trivial. Reserved to make future changes.

        :param node: A HierarchyNode instance.
        :return: The calling node.
        """
        self._insert_child(node)
        return self

    def _insert_child(self, child):
        child.parent = self
        child.save()


class NodeReferencingModel(models.Model):
    class Meta:
        abstract = True

    _node = TreeForeignKey('HierarchyNode', blank=False, null=False, on_delete=models.CASCADE)

    def delete(self, *args, **kwargs):
        self._node.delete()
        return super(NodeReferencingModel, self).delete(*args, **kwargs)


class Collection(NodeReferencingModel):
    """
    Collections are hierarchical groups of users, used for making decisions about user's permissions.
    Users belong to one or more Collections, by way of obtaining Roles associated with those Collections.
    Collections can belong to other Collections, and user membership in a collection is conferred by parenthood.
    Collections are subdivided into several pre-defined levels.

    The hierarchy of Roles and Collections forms a tree structure, and a description can be found
    `in the dev bible <https://docs.google.com/document/d/1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8/edit>`_.
    """
    kind = models.CharField(max_length=50)

    def save(self, *args, **kwargs):
        self._node = HierarchyNode.objects.create(kind='Collection')
        return super(Collection, self).save(*args, **kwargs)


class Role(NodeReferencingModel):
    """
    Roles are abstractions for making decisions about user's permissions.
    Users have one or more Roles, potentially with many different `kind`s.
    Roles are associated with Collections by convention, for instance a Role with `kind` "Coach" is associated with
    a Classroom collection -- this association is not strictly enforced, and so must be honored by the developer when
    directly adding Roles to the hierarchy.
    The hierarchy of Roles and Collections forms a tree structure, and a description can be found
    `in the dev bible <https://docs.google.com/document/d/1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8/edit>`_.
    """
    kind = models.CharField(max_length=50)
    user = models.ForeignKey('FacilityUser', blank=False, null=False)

    @classmethod
    def permitted_objects(cls, perm, request_user):
        raise NotImplementedError()

    def save(self, *args, **kwargs):
        self._node = HierarchyNode.objects.create(kind='Role', kind_id=self.user.id)
        return super(Role, self).save(*args, **kwargs)
