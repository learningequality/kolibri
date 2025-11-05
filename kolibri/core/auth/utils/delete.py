import logging
import time

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
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
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
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.models import SyncQueue
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
from kolibri.core.logger.models import GenerateCSVLogRequest
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


def _get_certificates(dataset_id=None, user=None):
    if user is None and dataset_id is None:
        raise ValueError(
            "Either dataset_id or user must be provided to get Certificate objects."
        )

    if dataset_id is not None:
        filter_q = Q(
            id=dataset_id,
        )
    else:
        filter_q = Q(
            scope_definition_id=ScopeDefinitions.SINGLE_USER,
            scope_params__contains=user.id,
        )

    return (
        Certificate.objects.filter(filter_q)
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
            LearnerDeviceStatus.objects.filter(dataset_id_filter),
            DevicePermissions.objects.filter(user_id_filter),
            PingbackNotificationDismissed.objects.filter(user_id_filter),
            Collection.objects.filter(Q(parent_id__isnull=True) & dataset_id_filter),
            Role.objects.filter(dataset_id_filter),
            Membership.objects.filter(dataset_id_filter),
            Bookmark.objects.filter(dataset_id_filter),
            FacilityUser.all_objects.filter(dataset_id_filter),
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
            GenerateCSVLogRequest.objects.filter(facility=dataset_id),
        ],
    )


def _get_user_partition_filters(user):
    partition_filters = [
        f"{user.dataset_id}:user-ro:{user.id}",
        f"{user.dataset_id}:user-rw:{user.id}",
    ]
    return partition_filters


def _get_database_max_counters(dataset_id=None, user=None):
    if user is None and dataset_id is None:
        raise ValueError(
            "Either dataset_id or user must be provided to get DatabaseMaxCounter objects."
        )

    if dataset_id is not None:
        return DatabaseMaxCounter.objects.filter(partition__startswith=dataset_id)

    partition_filters = _get_user_partition_filters(user)
    return DatabaseMaxCounter.objects.filter(partition__in=partition_filters)


def _get_stores(dataset_id=None, user=None):
    if user is None and dataset_id is None:
        raise ValueError(
            "Either dataset_id or user must be provided to get Store objects."
        )

    if dataset_id is not None:
        return Store.objects.filter(partition__startswith=dataset_id)

    partition_filters = _get_user_partition_filters(user)
    return Store.objects.filter(partition__in=partition_filters)


def _get_morango_models(dataset_id=None, user=None):
    querysets = [_get_database_max_counters(dataset_id, user)]

    stores = _get_stores(dataset_id, user)
    store_ids = stores.values_list("pk", flat=True)

    for store_ids_chunk in chunk(list(store_ids), 300):
        querysets.append(
            RecordMaxCounter.objects.filter(store_model_id__in=store_ids_chunk)
        )
        querysets.append(DeletedModels.objects.filter(id__in=store_ids_chunk))

    # append after RecordMaxCounter
    querysets.append(stores)

    certificates = _get_certificates(dataset_id, user)
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
        logger.warning(
            "Deleted {} database records but expected to delete {} records for facility {}".format(
                count, total_to_delete, facility.name
            )
        )
    logger.info("Deleted facility {}".format(facility.name))


def _get_user_related_models(user):
    user_id_filter = Q(user_id=user.id)

    return GroupDeletion(
        "User models",
        querysets=[
            LearnerDeviceStatus.objects.filter(user_id_filter),
            DevicePermissions.objects.filter(user_id_filter),
            PingbackNotificationDismissed.objects.filter(user_id_filter),
            Role.objects.filter(user_id_filter),
            Membership.objects.filter(user_id_filter),
            Bookmark.objects.filter(user_id_filter),
            SyncQueue.objects.filter(user_id_filter),
            FacilityUser.objects.filter(id=user.id),
        ],
    )


def _get_user_class_models(user):
    user_id_filter = Q(user_id=user.id)
    return GroupDeletion(
        "Class models",
        querysets=[
            ExamAssignment.objects.filter(assigned_by_id=user.id),
            Exam.objects.filter(creator_id=user.id),
            IndividualSyncableExam.objects.filter(user_id_filter),
            LessonAssignment.objects.filter(assigned_by_id=user.id),
            Lesson.objects.filter(created_by_id=user.id),
            IndividualSyncableLesson.objects.filter(user_id_filter),
        ],
    )


def _get_user_log_models(user):
    user_id_filter = Q(user_id=user.id)
    return GroupDeletion(
        "Log models",
        querysets=[
            ContentSessionLog.objects.filter(user_id_filter),
            ContentSummaryLog.objects.filter(user_id_filter),
            AttemptLog.objects.filter(user_id_filter),
            ExamAttemptLog.objects.filter(user_id_filter),
            ExamLog.objects.filter(user_id_filter),
            MasteryLog.objects.filter(user_id_filter),
            UserSessionLog.objects.filter(user_id_filter),
        ],
    )


def get_delete_group_for_user(user):
    # everything should get cascade deleted from the user, but we'll check anyway
    return GroupDeletion(
        "Main",
        groups=[
            _get_morango_models(user=user),
            _get_user_log_models(user),
            _get_user_class_models(user),
            _get_user_related_models(user),
        ],
    )


def delete_imported_user(user):
    logger.info(f"Deleting user {user.username}")
    delete_group = get_delete_group_for_user(user)
    total_to_delete = delete_group.count()
    logger.info(f"Deleting {total_to_delete} database records for user {user.username}")
    with DisablePostDeleteSignal(), transaction.atomic():
        count, _ = delete_group.delete()
        dataset_cache.clear()
    if count == total_to_delete:
        logger.info(f"Deleted {count} database records for user {user.username}")
    else:
        logger.warning(
            f"Deleted {count} database records but expected to delete {total_to_delete} records for user {user.username}"
        )
    logger.info(f"Deleted user {user.username}")
