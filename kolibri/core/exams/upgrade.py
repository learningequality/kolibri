"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from morango.models.core import UUIDField

from kolibri.core.auth.models import Collection
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.upgrade import version_upgrade

logger = logging.getLogger(__name__)


@version_upgrade(old_version="<0.15.0")
def resolve_conflicting_datasets_for_exams_and_related_models():
    """
    Superusers could create exams or assignments in a different facility than the facility they
    reside in, which caused a mismatch in the exam dataset and prevented syncing
    """
    # un-set creator for all exams created by user in a different dataset
    exam_sub_query = Subquery(
        Collection.objects.filter(pk=OuterRef("collection_id")).values("dataset_id")[
            :1
        ],
        output_field=UUIDField(),
    )
    Exam.objects.exclude(collection__dataset_id=F("dataset_id")).update(
        creator=None, dataset_id=exam_sub_query
    )

    # un-set assigned_by for all exam assignments assigned by a user in a different dataset
    assignment_sub_query = Subquery(
        Exam.objects.filter(pk=OuterRef("exam_id")).values("dataset_id")[:1],
        output_field=UUIDField(),
    )
    ExamAssignment.objects.exclude(exam__dataset_id=F("dataset_id")).update(
        assigned_by=None, dataset_id=assignment_sub_query
    )
