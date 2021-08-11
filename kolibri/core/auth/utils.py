import sys

from django.utils.six.moves import input
from morango.sync.operations import LocalOperation

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.notifications.api import batch_process_attemptlogs
from kolibri.core.notifications.api import batch_process_examlogs
from kolibri.core.notifications.api import batch_process_summarylogs


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


def create_adhoc_group_for_learners(classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name="Ad hoc", parent=classroom)
    for learner in learners:
        Membership.objects.create(user=learner, collection=adhoc_group)
    return adhoc_group


def _merge_user_models(source_user, target_user):
    for f in ["gender", "birth_year", "id_number"]:
        source_value = getattr(source_user, f, None)
        target_value = getattr(target_user, f, None)
        if not target_value and source_value:
            setattr(target_user, f, source_value)
    target_user.save()


blocklist = set(["id", "_morango_partition"])


def merge_users(source_user, target_user):
    """
    Utility to merge two users. It makes no assumptions about whether
    the users are in the same facility and does raw copies of all
    associated user data, rather than try to do anything clever.
    """
    if source_user.id == target_user.id:
        raise ValueError("Cannot merge a user with themselves")

    _merge_user_models(source_user, target_user)

    id_map = {
        FacilityUser: {source_user.id: target_user.id},
        FacilityDataset: {
            source_user.dataset_id: target_user.dataset_id,
        },
    }

    def _merge_log_data(LogModel):
        log_map = {}
        id_map[LogModel] = log_map
        new_logs = []
        related_fields = [f for f in LogModel._meta.concrete_fields if f.is_relation]
        source_logs = LogModel.objects.filter(user=source_user)
        target_log_ids = set(
            LogModel.objects.filter(user=target_user).values_list("id", flat=True)
        )
        for log in source_logs:
            # Get all serialializable fields
            data = log.serialize()
            # Remove fields that we explicitly know we don't want to copy
            for f in blocklist:
                if f in data:
                    del data[f]
            # Iterate through each relation and map the old id to the new id for the foreign key
            for relation in related_fields:
                data[relation.attname] = id_map[relation.related_model][
                    data[relation.attname]
                ]
            # If this is a randomly created source id, preserve it, so we can stop the same logs
            # being copied in repeatedly. If it is not random, remove it, so we can recreate
            # it on the target.
            if log.calculate_source_id() is not None:
                del data["_morango_source_id"]
            new_log = LogModel.deserialize(data)
            if not new_log._morango_source_id:
                new_log.id = new_log.calculate_uuid()
            else:
                # Have to do this, otherwise morango will overwrite the current source id on the model
                new_log.id = new_log.compute_namespaced_id(
                    new_log.calculate_partition(),
                    new_log._morango_source_id,
                    new_log.morango_model_name,
                )
                new_log._morango_partition = new_log.calculate_partition().replace(
                    new_log.ID_PLACEHOLDER, new_log.id
                )
            log_map[log.id] = new_log.id
            if new_log.id not in target_log_ids:
                new_logs.append(new_log)
        LogModel.objects.bulk_create(new_logs, batch_size=750)

    _merge_log_data(ContentSessionLog)

    _merge_log_data(ContentSummaryLog)

    _merge_log_data(UserSessionLog)

    _merge_log_data(MasteryLog)

    _merge_log_data(AttemptLog)


class GenerateNotifications(LocalOperation):
    """
    Generates notifications at cleanup stage (the end) of a transfer, if our instance was a
    "receiver" meaning we have received data
    """

    def handle(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        :return: False
        """
        assert context.is_receiver
        assert context.transfer_session is not None

        batch_process_attemptlogs(
            context.transfer_session.get_touched_record_ids_for_model(
                AttemptLog.morango_model_name
            )
        )
        batch_process_examlogs(
            context.transfer_session.get_touched_record_ids_for_model(
                ExamLog.morango_model_name
            ),
            context.transfer_session.get_touched_record_ids_for_model(
                ExamAttemptLog.morango_model_name
            ),
        )
        batch_process_summarylogs(
            context.transfer_session.get_touched_record_ids_for_model(
                ContentSummaryLog.morango_model_name
            )
        )

        # always return false, indicating that other operations in this stage's configuration
        # should also be executed
        return False
