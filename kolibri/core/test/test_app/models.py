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


# Synthetic relation zoo for test_api.py.
#
# Author is the primary outer model (UUID pk + scalar fields covering the
# types exercised by type-inference tests). The surrounding models provide
# every relation shape the introspection code distinguishes:
#
# - Publisher:   FK target (nullable, for flat FK-traversal + null FK tests)
# - Profile:     OneToOne to Author (single-nested + reverse 1:1)
# - Book:        reverse FK many (via Author.books) + direct M2M (Book.tags)
# - Tag:         M2M target (reverse M2M via Tag.books)
# - Enrollment:  through-model for Author↔Classroom M2M (Author.classrooms)


class Publisher(models.Model):
    name = models.CharField(max_length=128, default="")


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


class Enrollment(models.Model):
    author = models.ForeignKey(
        Author, related_name="enrollments", on_delete=models.CASCADE
    )
    classroom = models.ForeignKey(
        Classroom, related_name="author_enrollments", on_delete=models.CASCADE
    )
