"""
We have three main abstractions: Users, Collections, and Roles. Users represent people, like students in a school,
teachers for a classroom, or volunteers setting up informal installations.

Collections are hierarchical groups of users. Users belong to one or more Collections, and Collections can belong to
other Collections. Collections are subdivided into several pre-defined levels.

Roles belong to collections, and represent permissions. Users have one or more Roles. For instance, Classes (a type
of Collection) have an associated Coach Role -- that Coach has permission to view related User data for Users in the
Class.
"""
from __future__ import unicode_literals

from django.contrib.auth.models import AbstractBaseUser
from django.core import validators
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone


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

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def is_device_owner(self):
        raise NotImplementedError()

    def get_full_name(self):
        return self.first_name + " " + self.last_name

    def get_short_name(self):
        return self.first_name


class FacilityUser(BaseUser):
    """
    FacilityUsers are the fundamental object of the auth app. They represent the main users, and belong to a
    hierarchy of Collections and Roles, which determine permissions.
    """
    class Meta:
        proxy = True

    def is_device_owner(self):
        return False


class DeviceOwner(BaseUser):
    """
    When a user first installs Kolibri on a device, they will be prompted to create a *DeviceOwner*, a special kind of
    user which is associated with that device only, and who must give permission to make broad changes to the Kolibri
    installation on that device (such as creating a Facility, or changing configuration settings).

    Actions not relating to user data but specifically to a device, like upgrading Kolibri, changing whether the
    device is a Classroom Server or Classroom Client, or determining manually which data should be synced must be
    performed by a DeviceOwner.
    """
    class Meta:
        proxy = True

    def is_device_owner(self):
        return True
