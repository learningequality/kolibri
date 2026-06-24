import datetime
import uuid

from django.db import models
from django.utils import timezone

from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import JSONField


def aware_datetime():
    return timezone.get_current_timezone().localize(
        datetime.datetime(2000, 12, 11, 10, 9, 8)
    )


class User(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Classroom(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Membership(models.Model):
    user = models.ForeignKey(
        "User",
        related_name="memberships",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    classroom = models.ForeignKey(
        "Classroom",
        related_name="memberships",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )


class DateTimeTzModel(models.Model):
    timestamp = DateTimeTzField(null=True)
    default_timestamp = DateTimeTzField(default=aware_datetime)


# Synthetic relation zoo for test_api.py. Author is the primary outer model
# (UUID pk + scalar fields for type-inference tests); surrounding models cover
# every relation shape introspection distinguishes:
# - Country:    FK target for Publisher (nullable, deep FK-traversal tests)
# - Publisher:  FK target (nullable, flat FK-traversal + null FK tests)
# - Profile:    OneToOne to Author (single-nested + reverse 1:1)
# - Book:       reverse FK many via Author.books
# - Tag:        M2M target; Book.tags is the forward M2M
# - Enrollment: through-model for Author↔Classroom M2M (Author.classrooms)
# - Award:      second reverse-FK many on Author (Author.awards)
# - Review:     grandchild reverse-FK many on Book (Book.reviews)


class Country(models.Model):
    name = models.CharField(max_length=128, default="")


class Publisher(models.Model):
    name = models.CharField(max_length=128, default="")
    country = models.ForeignKey(
        Country,
        related_name="publishers",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )


class Author(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128, default="")
    email = models.CharField(max_length=128, default="")
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=16,
        choices=[("active", "Active"), ("retired", "Retired"), ("", "")],
        default="active",
    )
    publisher = models.ForeignKey(
        Publisher,
        related_name="authors",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    classrooms = models.ManyToManyField(
        Classroom,
        through="Enrollment",
        related_name="enrolled_authors",
    )
    metadata = JSONField(null=True, blank=True, default=dict)


class Profile(models.Model):
    author = models.OneToOneField(
        Author,
        related_name="profile",
        on_delete=models.CASCADE,
    )
    bio = models.CharField(max_length=255, default="", blank=True)
    is_verified = models.BooleanField(default=False)


class Tag(models.Model):
    name = models.CharField(max_length=64, default="")


class Book(models.Model):
    author = models.ForeignKey(Author, related_name="books", on_delete=models.CASCADE)
    title = models.CharField(max_length=128, default="")
    description = models.CharField(max_length=255, null=True, blank=True)
    tags = models.ManyToManyField(Tag, related_name="books")
    publisher = models.ForeignKey(
        Publisher,
        related_name="books",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )


class Enrollment(models.Model):
    author = models.ForeignKey(
        Author, related_name="enrollments", on_delete=models.CASCADE
    )
    classroom = models.ForeignKey(
        Classroom, related_name="author_enrollments", on_delete=models.CASCADE
    )


class Award(models.Model):
    author = models.ForeignKey(Author, related_name="awards", on_delete=models.CASCADE)
    name = models.CharField(max_length=128, default="")


class Review(models.Model):
    book = models.ForeignKey(Book, related_name="reviews", on_delete=models.CASCADE)
    rating = models.IntegerField(default=0)


# Manager-semantics fixture: Hideable's default manager filters out hidden rows
# (soft-delete style), reachable from HideableOwner four ways, so auto-fetch's
# base-vs-default manager choice can be pinned per relation direction:
# - featured:      forward FK   -> base manager (a referenced row is never hidden)
# - solo_hideable: reverse O2O  -> base manager
# - hideables:     reverse FK   -> default manager (hidden rows excluded)
# - tagged:        M2M          -> default manager


class VisibleHideableManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(hidden=False)


class HideableOwner(models.Model):
    name = models.CharField(max_length=128, default="")
    featured = models.ForeignKey(
        "Hideable",
        related_name="featured_for",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    tagged = models.ManyToManyField("Hideable", related_name="tagged_by")


class Hideable(models.Model):
    name = models.CharField(max_length=128, default="")
    hidden = models.BooleanField(default=False)
    owner = models.ForeignKey(
        HideableOwner,
        related_name="hideables",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    solo_owner = models.OneToOneField(
        HideableOwner,
        related_name="solo_hideable",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    objects = VisibleHideableManager()


class HideableAccount(models.Model):
    # to-one FK onto HideableOwner, so a scalar source can cross a to-one then a
    # to-many onto Hideable (``owner.hideables.name``) — exercising the reversed
    # relation-path fetch and the to-many's default-manager filtering.
    name = models.CharField(max_length=128, default="")
    owner = models.ForeignKey(
        HideableOwner,
        related_name="accounts",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
