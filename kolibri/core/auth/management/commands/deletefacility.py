import logging
from contextlib import contextmanager

from django.contrib.admin.models import LogEntry
from django.core.management.base import CommandError
from django.db import transaction
from django.db.models import Q
from morango.models import Buffer
from morango.models import Certificate
from morango.models import DatabaseMaxCounter
from morango.models import RecordMaxCounter
from morango.models import RecordMaxCounterBuffer
from morango.models import Store
from morango.models import SyncSession
from morango.models import TransferSession

from kolibri.core.analytics.models import PingbackNotificationDismissed
from kolibri.core.auth.management.utils import DisablePostDeleteSignal
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.management.utils import GroupDeletion
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.auth.utils import confirm_or_exit
from kolibri.core.device.models import DevicePermissions
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


def chunk(things, size):
    """
    Chunk generator

    :type things: list
    :type size: int
    """
    for i in range(0, len(things), size):
        yield things[i : i + size]


class Command(AsyncCommand):
    help = "This command initiates the deletion process for a facility and all of it's related data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="The ID of the facility to delete",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enforce that deletion count matches expected count",
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):
        noninteractive = options["noninteractive"]
        strict = options["strict"]
        facility = get_facility(
            facility_id=options["facility"], noninteractive=noninteractive
        )
        dataset_id = facility.dataset_id

        logger.info(
            "Found facility {} <{}> for deletion".format(facility.id, dataset_id)
        )

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to permanently delete this facility? This will DELETE ALL DATA FOR THE FACILITY."
            )
            confirm_or_exit(
                "ARE YOU SURE? If you do this, there is no way to recover the facility data on this device."
            )

        # everything should get cascade deleted from the facility, but we'll check anyway
        delete_group = GroupDeletion(
            "Main",
            groups=[
                self._get_morango_models(dataset_id),
                self._get_log_models(dataset_id),
                self._get_class_models(dataset_id),
                self._get_users(dataset_id),
                self._get_facility_dataset(dataset_id),
            ],
        )

        logger.info(
            "Proceeding with facility deletion. Deleting all data for facility <{}>".format(
                dataset_id
            )
        )

        with self._delete_context():
            total_deleted = 0

            # run the counting step
            with self.start_progress(
                total=delete_group.group_count()
            ) as update_progress:
                update_progress(increment=0, message="Counting database objects")
                total_count = delete_group.count(update_progress)

            # no the deleting step
            with self.start_progress(total=total_count) as update_progress:
                update_progress(increment=0, message="Deleting database objects")
                count, stats = delete_group.delete(update_progress)
                total_deleted += count
                # clear related cache
                dataset_cache.clear()

            # if count doesn't match, something doesn't seem right
            if total_count != total_deleted:
                msg = "Deleted count does not match total ({} != {})".format(
                    total_count, total_deleted
                )
                if strict:
                    raise CommandError("{}, aborting!".format(msg))
                else:
                    logger.warning(msg)

        logger.info("Deletion complete.")

    @contextmanager
    def _delete_context(self):
        with DisablePostDeleteSignal(), transaction.atomic():
            yield

    def _get_facility_dataset(self, dataset_id):
        return FacilityDataset.objects.filter(id=dataset_id)

    def _get_certificates(self, dataset_id):
        return (
            Certificate.objects.filter(id=dataset_id)
            .get_descendants(include_self=True)
            .exclude(_private_key=None)
        )

    def _get_users(self, dataset_id):
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
                Collection.objects.filter(
                    Q(parent_id__isnull=True) & dataset_id_filter
                ),
                Role.objects.filter(dataset_id_filter),
                Membership.objects.filter(dataset_id_filter),
                FacilityUser.objects.filter(dataset_id_filter),
            ],
        )

    def _get_class_models(self, dataset_id):
        dataset_id_filter = Q(dataset_id=dataset_id)
        return GroupDeletion(
            "Class models",
            querysets=[
                ExamAssignment.objects.filter(dataset_id_filter),
                Exam.objects.filter(dataset_id_filter),
                LessonAssignment.objects.filter(dataset_id_filter),
                Lesson.objects.filter(dataset_id_filter),
                AdHocGroup.objects.filter(dataset_id_filter),
                LearnerGroup.objects.filter(dataset_id_filter),
                Classroom.objects.filter(dataset_id_filter),
            ],
        )

    def _get_log_models(self, dataset_id):
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

    def _get_morango_models(self, dataset_id):
        querysets = [
            DatabaseMaxCounter.objects.filter(partition__startswith=dataset_id)
        ]

        stores = Store.objects.filter(partition__startswith=dataset_id)
        store_ids = stores.values_list("pk", flat=True)

        for store_ids_chunk in chunk(list(store_ids), 300):
            querysets.append(
                RecordMaxCounter.objects.filter(store_model_id__in=store_ids_chunk)
            )

        # append after RecordMaxCounter
        querysets.append(stores)

        certificates = self._get_certificates(dataset_id)
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
