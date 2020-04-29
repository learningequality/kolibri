from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.db import models
from django.test import TestCase

from kolibri.core.query import GroupConcatSubquery


class User(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Classroom(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Membership(models.Model):
    user = models.ForeignKey(
        "User", related_name="memberships", blank=False, null=False
    )
    classroom = models.ForeignKey(
        "Classroom", related_name="memberships", blank=False, null=False
    )


class GroupConcatSubqueryTestCase(TestCase):
    def test_concat(self):
        student1 = User.objects.create(name="student1")
        student2 = User.objects.create(name="student2")
        classroom1 = Classroom.objects.create(name="class1")
        classroom2 = Classroom.objects.create(name="class2")
        Membership.objects.create(classroom=classroom1, user=student1)
        Membership.objects.create(classroom=classroom1, user=student2)
        Membership.objects.create(classroom=classroom2, user=student1)

        query = Classroom.objects.values("pk").annotate(
            enrolled=GroupConcatSubquery(
                User.objects.filter(
                    memberships__classroom_id=models.OuterRef("id")
                ).values("name"),
                field="name",
            )
        )
        result = query.values("name", "enrolled")
        assert result[0]["enrolled"] == "student1,student2"
        assert result[1]["enrolled"] == "student1"
