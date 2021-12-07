import logging
import time

from django.contrib.admin.models import LogEntry
from django.db import transaction
from django.db.models import Q
from django.db.models.signals import post_delete
from morango.models import Buffer
from morango.models import Certificate
from morango.models import DatabaseMaxCounter
from morango.models import DeletedModels
from morango.models import RecordMaxCounter
from morango.models import RecordMaxCounterBuffer
from morango.models import Store
from morango.models import SyncSession
from morango.models import TransferSession

from kolibri.core.analytics.models import PingbackNotificationDismissed
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.bookmarks.models import Bookmark
from kolibri.core.device.models import DevicePermissions
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.exams.models import IndividualSyncableExam
from kolibri.core.lessons.models import IndividualSyncableLesson
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog


logger = logging.getLogger(__name__)


class DisablePostDeleteSignal(object):
    """
    Helper that disables the post_delete signal temporarily when deleting, so Morango doesn't
    create DeletedModels objects for what we're deleting
    """

    def __enter__(self):
        self.receivers = post_delete.receivers
        post_delete.receivers = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        post_delete.receivers = self.receivers
        self.receivers = None


class GroupDeletion(object):
    """
    Helper to manage deleting many models, or groups of models
    """

    def __init__(self, name, groups=None, querysets=None, sleep=None):
        """
        :type groups: GroupDeletion[]
        :type querysets: QuerySet[]
        :type sleep: int
        """
        self.name = name
        groups = [] if groups is None else groups
        if querysets is not None:
            groups.extend(querysets)
        self.groups = groups
        self.sleep = sleep

    def get_querysets(self):
        querysets = []
        for qs in self.groups:
            if isinstance(qs, GroupDeletion):
                querysets.extend(qs.get_querysets())
            else:
                querysets.append(qs)

        return querysets

    def count(self, progress_updater=None):
        """
        :type progress_updater: function
        :rtype: int
        """
        sum = 0
        for qs in self.groups:
            if isinstance(qs, GroupDeletion):
                count = qs.count(progress_updater)
                logger.debug("Counted {} in group `{}`".format(count, qs.name))
            else:
                count = qs.count()
                if progress_updater:
                    progress_updater(increment=1)
                logger.debug(
                    "Counted {} of `{}`".format(count, qs.model._meta.model_name)
                )

            sum += count

        return sum

    def group_count(self):
        """
        :rtype: int
        """
        return sum(
            [
                qs.group_count() if isinstance(qs, GroupDeletion) else 1
                for qs in self.groups
            ]
        )

    def delete(self, progress_updater=None, sleep=None):
        """
        :type progress_updater: function
        :type sleep: int
        :rtype: tuple(int, dict)
        """
        total_count = 0
        all_deletions = {}
        sleep = self.sleep if sleep is None else sleep

        for qs in self.groups:
            if isinstance(qs, GroupDeletion):
                count, deletions = qs.delete(progress_updater)
                debug_msg = "Deleted {} of `{}` in group `{}`"
                name = qs.name
            else:
                count, deletions = qs.delete()
                debug_msg = "Deleted {} of `{}` with model `{}`"
                name = qs.model._meta.model_name

            total_count += count
            if progress_updater:
                progress_updater(increment=count)

            for obj_name, count in deletions.items():
                if not isinstance(qs, GroupDeletion):
                    logger.debug(debug_msg.format(count, obj_name, name))
                all_deletions.update({obj_name: all_deletions.get(obj_name, 0) + count})
            if self.sleep is not None:
                time.sleep(sleep)

        return total_count, all_deletions


def chunk(things, size):
    """
    Chunk generator

    :type things: list
    :type size: int
    """
    for i in range(0, len(things), size):
        yield things[i : i + size]


def _get_facility_dataset(dataset_id):
    return FacilityDataset.objects.filter(id=dataset_id)


def _get_certificates(dataset_id):
    return (
        Certificate.objects.filter(id=dataset_id)
        .get_descendants(include_self=True)
        .exclude(_private_key=None)
    )


def _get_users(dataset_id):
    user_id_filter = Q(
        user_id__in=FacilityUser.objects.filter(dataset_id=dataset_id).values_list(
            "pk", flat=True
        )
    )
    dataset_id_filter = Q(dataset_id=dataset_id)

    return GroupDeletion(
        "User models",
        querysets=[
            LogEntry.objects.filter(user_id_filter),
            DevicePermissions.objects.filter(user_id_filter),
            PingbackNotificationDismissed.objects.filter(user_id_filter),
            Collection.objects.filter(Q(parent_id__isnull=True) & dataset_id_filter),
            Role.objects.filter(dataset_id_filter),
            Membership.objects.filter(dataset_id_filter),
            Bookmark.objects.filter(dataset_id_filter),
            FacilityUser.objects.filter(dataset_id_filter),
            Facility.objects.filter(dataset_id_filter),
        ],
    )


def _get_class_models(dataset_id):
    dataset_id_filter = Q(dataset_id=dataset_id)
    return GroupDeletion(
        "Class models",
        querysets=[
            ExamAssignment.objects.filter(dataset_id_filter),
            Exam.objects.filter(dataset_id_filter),
            IndividualSyncableExam.objects.filter(dataset_id_filter),
            LessonAssignment.objects.filter(dataset_id_filter),
            Lesson.objects.filter(dataset_id_filter),
            IndividualSyncableLesson.objects.filter(dataset_id_filter),
            AdHocGroup.objects.filter(dataset_id_filter),
            LearnerGroup.objects.filter(dataset_id_filter),
            Classroom.objects.filter(dataset_id_filter),
        ],
    )


def _get_log_models(dataset_id):
    dataset_id_filter = Q(dataset_id=dataset_id)
    return GroupDeletion(
        "Log models",
        querysets=[
            ContentSessionLog.objects.filter(dataset_id_filter),
            ContentSummaryLog.objects.filter(dataset_id_filter),
            AttemptLog.objects.filter(dataset_id_filter),
            ExamAttemptLog.objects.filter(dataset_id_filter),
            ExamLog.objects.filter(dataset_id_filter),
            MasteryLog.objects.filter(dataset_id_filter),
            UserSessionLog.objects.filter(dataset_id_filter),
        ],
    )


def _get_morango_models(dataset_id):
    querysets = [DatabaseMaxCounter.objects.filter(partition__startswith=dataset_id)]

    stores = Store.objects.filter(partition__startswith=dataset_id)
    store_ids = stores.values_list("pk", flat=True)

    for store_ids_chunk in chunk(list(store_ids), 300):
        querysets.append(
            RecordMaxCounter.objects.filter(store_model_id__in=store_ids_chunk)
        )
        querysets.append(DeletedModels.objects.filter(id__in=store_ids_chunk))

    # append after RecordMaxCounter
    querysets.append(stores)

    certificates = _get_certificates(dataset_id)
    certificate_ids = certificates.distinct().values_list("pk", flat=True)

    for certificate_id_chunk in chunk(certificate_ids, 300):
        sync_sessions = SyncSession.objects.filter(
            Q(client_certificate_id__in=certificate_id_chunk)
            | Q(server_certificate_id__in=certificate_id_chunk)
        )
        sync_session_ids = sync_sessions.distinct().values_list("pk", flat=True)
        transfer_sessions = TransferSession.objects.filter(
            sync_session_id__in=sync_session_ids
        )
        transfer_session_filter = Q(
            transfer_session_id__in=transfer_sessions.values_list("pk", flat=True)
        )

        querysets.extend(
            [
                RecordMaxCounterBuffer.objects.filter(transfer_session_filter),
                Buffer.objects.filter(transfer_session_filter),
                transfer_sessions,
                sync_sessions,
                certificates,
            ]
        )

    return GroupDeletion("Morango models", groups=querysets)


def get_delete_group_for_facility(facility):
    dataset_id = facility.dataset_id
    # everything should get cascade deleted from the facility, but we'll check anyway
    return GroupDeletion(
        "Main",
        groups=[
            _get_morango_models(dataset_id),
            _get_log_models(dataset_id),
            _get_class_models(dataset_id),
            _get_users(dataset_id),
            _get_facility_dataset(dataset_id),
        ],
    )


def clean_up_legacy_counters():
    # remove any legacy counters with empty partition, and add corresponding counters for remaining facility datasets
    for dmc in DatabaseMaxCounter.objects.filter(partition=""):
        for dataset in FacilityDataset.objects.all():
            newdmc, _ = DatabaseMaxCounter.objects.get_or_create(
                instance_id=dmc.instance_id, partition=dataset.id
            )
            if newdmc.counter != dmc.counter:
                newdmc.counter = max(newdmc.counter, dmc.counter)
                newdmc.save()
        dmc.delete()


def delete_facility(facility):
    logger.info("Deleting facility {}".format(facility.name))
    delete_group = get_delete_group_for_facility(facility)
    total_to_delete = delete_group.count()
    logger.info(
        "Deleting {} database records for facility {}".format(
            total_to_delete, facility.name
        )
    )
    with DisablePostDeleteSignal(), transaction.atomic():
        count, _ = delete_group.delete()
        clean_up_legacy_counters()
        dataset_cache.clear()
    if count == total_to_delete:
        logger.info(
            "Deleted {} database records for facility {}".format(count, facility.name)
        )
    else:
        logger.warn(
            "Deleted {} database records but expected to delete {} records for facility {}".format(
                count, total_to_delete, facility.name
            )
        )
    logger.info("Deleted facility {}".format(facility.name))
