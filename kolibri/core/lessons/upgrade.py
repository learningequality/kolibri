"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from morango.models.core import UUIDField

from kolibri.core.auth.models import Collection
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.upgrade import version_upgrade

logger = logging.getLogger(__name__)


@version_upgrade(old_version="<0.15.0")
def resolve_conflicting_datasets_for_lessons_and_related_models():
    """
    Superusers could create lessons or assignments in a different facility than the facility they
    reside in, which caused a mismatch in the lesson dataset and prevented syncing
    """
    # un-set creator for all lessons created by user in a different dataset
    lesson_sub_query = Subquery(
        Collection.objects.filter(pk=OuterRef("collection_id")).values("dataset_id")[
            :1
        ],
        output_field=UUIDField(),
    )
    Lesson.objects.exclude(collection__dataset_id=F("dataset_id")).update(
        created_by=None, dataset_id=lesson_sub_query
    )

    # un-set assigned_by for all lesson assignments assigned by a user in a different dataset
    assignment_sub_query = Subquery(
        Lesson.objects.filter(pk=OuterRef("lesson_id")).values("dataset_id")[:1],
        output_field=UUIDField(),
    )
    LessonAssignment.objects.exclude(lesson__dataset_id=F("dataset_id")).update(
        assigned_by=None, dataset_id=assignment_sub_query
    )
