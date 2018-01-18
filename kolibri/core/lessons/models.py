from __future__ import unicode_literals
from django.db import models
from jsonfield import JSONField
from kolibri.auth.models import AbstractFacilityDataModel, Collection, FacilityUser
from kolibri.auth.permissions.base import RoleBasedPermissions
from kolibri.auth.constants import role_kinds

class Lesson(AbstractFacilityDataModel):
    """
    A Lesson is a collection of non-topic ContentNodes that is linked to
    a Classroom and LearnerGroups within that Classroom.
    """

    permissions = RoleBasedPermissions(
        target_field='collection',
        can_be_created_by=(),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(),
    )

    name = models.CharField(max_length=50)
    description = models.CharField(default='', blank=True, max_length=200)
    """
    Like Exams, we store an array of objects with the following form:
    {
      contentnode_id: string,
      position: integer // where the resource appears in the Lesson
    }
    """
    resources = JSONField(default=[], blank=True)
    # If True, then the Lesson should be viewable by Learners
    is_active = models.BooleanField(default=False)

    # The Classroom-type Collection for which the Lesson is created
    collection = models.ForeignKey(Collection, related_name='lessons', blank=False, null=False)
    created_by = models.ForeignKey(FacilityUser, related_name='lessons_created', blank=False, null=False)
    # Set to True when the Lesson is 'deleted'
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return 'Lesson {} for Classroom {}'.format(
            self.name,
            self.collection.name,
        )

    # Morango fields
    morango_model_name = 'lesson'

    def infer_dataset(self, *args, **kwargs):
        return self.created_by.dataset

    def calculate_partition(self):
        return self.dataset_id


class LessonAssignment(AbstractFacilityDataModel):
    """
    Links LearnerGroup- or Classroom-type Collections to a Lesson
    """

    permissions = (
        RoleBasedPermissions(
            target_field="collection",
            can_be_created_by=(),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_deleted_by=(),
        )
    )

    lesson = models.ForeignKey(Lesson, related_name='assigned_groups', blank=False, null=False)
    collection = models.ForeignKey(Collection, related_name='assigned_lessons', blank=False, null=False)
    assigned_by = models.ForeignKey(FacilityUser, related_name='assigned_lessons', blank=False, null=False)

    def __str__(self):
        return 'Lesson {} for Collection {}'.format(
            self.lesson.name,
            self.collection.name,
        )

    # Morango fields
    morango_model_name = 'lessonassignment'

    def infer_dataset(self, *args, **kwargs):
        return self.assigned_by.dataset

    def calculate_source_id(self):
        return "{lesson_id}:{collection_id}".format(lesson_id=self.lesson_id, collection_id=self.collection_id)

    def calculate_partition(self):
        return self.dataset_id
