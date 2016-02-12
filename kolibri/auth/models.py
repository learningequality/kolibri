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

from django.contrib.auth.models import AbstractBaseUser, _user_get_all_permissions, _user_has_module_perms, \
    _user_has_perm
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
    email, and we don't use the PermissionsMixin.
    Encapsulates both FacilityUsers and DeviceOwners, which are proxy models.

    You should prefer to use the proxy models for this class where possible.
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

    def has_perm(self, perm, obj=None):
        """
        Checks whether a user has the given permission.

        :param perm: A string identifying the permission. See the backends module in this app for a complete list.
        :param obj: An optional object, the interpretation of which depends on the permission string.
        :return: True or False
        :raises: ``InvalidPermission`` if the given permission string is unknown, or if the optional ``obj`` is an
            unexpected type.
        """
        return _user_has_perm(self, perm, obj)

    def has_module_perms(self, package_name):
        return _user_has_module_perms(self, package_name)

    def get_all_permissions(self, obj=None):
        return _user_get_all_permissions(self, obj)

    def is_facility_admin(self):
        """
        Identifies whether the given user instance is a FacilityAdmin or not, which can short-circuit some permissions
        checks.

        :return: True or False for FacilityUsers. Always False for DeviceOwners.
        :raise: NotImplementedError for BaseUsers -- use the proxy models instead.
        """
        raise NotImplementedError()


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

    def is_facility_admin(self):
        return FacilityAdmin.objects.filter(user=self).exists()


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

    def is_facility_admin(self):
        return False


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

    def add_subcollection(self, collection):
        self._node.insert_collection_node(collection._node)

    def add_role(self, role):
        self._node.insert_role_node(role._node)


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


class FacilityAdminManager(models.Manager):
    def get_queryset(self):
        return super(FacilityAdminManager, self).get_queryset().filter(kind='FacilityAdmin')


class CoachManager(models.Manager):
    def get_queryset(self):
        return super(CoachManager, self).get_queryset().filter(kind='Coach')


class LearnerManager(models.Manager):
    def get_queryset(self):
        return super(LearnerManager, self).get_queryset().filter(kind='Learner')


class FacilityAdmin(Role):
    objects = FacilityAdminManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = "FacilityAdmin"
        return super(FacilityAdmin, self).save(*args, **kwargs)


class Coach(Role):
    objects = CoachManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = "Coach"
        return super(Coach, self).save(*args, **kwargs)


class Learner(Role):
    objects = LearnerManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.kind = "Learner"
        return super(Learner, self).save(*args, **kwargs)


class FacilityManager(models.Manager):
    def get_queryset(self):
        return super(FacilityManager, self).get_queryset().filter(kind='Facility')


class ClassroomManager(models.Manager):
    def get_queryset(self):
        return super(ClassroomManager, self).get_queryset().filter(kind='Classroom')


class LearnerGroupManager(models.Manager):
    def get_queryset(self):
        return super(LearnerGroupManager, self).get_queryset().filter(kind='LearnerGroup')


class Facility(Collection):
    objects = FacilityManager()

    class Meta:
        proxy = True

    def add_admin(self, user):
        admin = FacilityAdmin.objects.create(user=user)
        self.add_role(admin)

    def add_classroom(self, classroom):
        self.add_subcollection(classroom)

    def save(self, *args, **kwargs):
        self.kind = "Facility"
        return super(Facility, self).save(*args, **kwargs)

    def remove_admin(self, user):
        role = FacilityAdmin.objects.get(user=user, _node__parent=self._node)
        role.delete()

    def add_admins(self, users):
        """
        Given an iterable of users, add each one as a FacilityAdmin.

        :param users: An iterable of FacilityUsers
        :return: self, for chaining
        """
        for user in users:
            self.add_admin(user)
        return self

    def add_classrooms(self, classrooms):
        """
        Adds each Classroom in the iterable to the Facility.

        :param classrooms: An iterable of Classrooms
        :return: self, for chaining
        """
        for c in classrooms:
            self.add_classroom(c)
        return self


class Classroom(Collection):
    objects = ClassroomManager()

    class Meta:
        proxy = True

    def add_coach(self, user):
        coach = Coach.objects.create(user=user)
        self.add_role(coach)

    def add_learner_group(self, learner_group):
        self.add_subcollection(learner_group)

    def save(self, *args, **kwargs):
        self.kind = "Classroom"
        return super(Classroom, self).save(*args, **kwargs)

    def remove_coach(self, user):
        role = Coach.objects.get(user=user, _node__parent=self._node)
        role.delete()

    def delete(self, *args, **kwargs):
        for coach in self.coaches():
            coach.delete()
        for lg in self.learner_groups():
            lg.delete()
        return super(Classroom, self).delete(*args, **kwargs)

    def coaches(self):
        """
        Returns a QuerySet of Coaches associated with the classroom.

        :return: A Coach QuerySet
        """
        return Coach.objects.filter(_node__parent=self._node)

    def learner_groups(self):
        """
        Returns a QuerySet of LearnerGroups associated with the classroom.

        :return: A LearnerGroup QuerySet
        """
        return LearnerGroup.objects.filter(_node__parent=self._node)

    def add_coaches(self, users):
        """
        Given an iterable of users, add each one as a Coach.

        :param users: An iterable of FacilityUsers
        :return: self, for chaining
        """
        for user in users:
            self.add_coach(user)
        return self

    def add_learner_groups(self, learner_groups):
        """
        Adds each Classroom in the iterable to the Facility.

        :param learner_groups: An iterable of LearnerGroups
        :return: self, for chaining
        """
        for lg in learner_groups:
            self.add_learner_group(lg)
        return self


class LearnerGroup(Collection):
    objects = LearnerGroupManager()

    class Meta:
        proxy = True

    def add_learner(self, user):
        learner = Learner.objects.create(user=user)
        self.add_role(learner)

    def save(self, *args, **kwargs):
        self.kind = "LearnerGroup"
        return super(LearnerGroup, self).save(*args, **kwargs)

    def remove_learner(self, user):
        role = Learner.objects.get(user=user, _node__parent=self._node)
        role.delete()

    def add_learners(self, users):
        """
        Given an iterable of users, add each one as a Learner.

        :param users: An iterable of FacilityUsers
        :return: self, for chaining
        """
        for user in users:
            self.add_learner(user)
        return self

    def classroom(self):
        """
        Gets the LearnerGroup's associated Classroom

        :return: A Classroom instance, if it exists.
        """
        return Classroom.objects.get(_node=self._node.parent)
