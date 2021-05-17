import sys

from django.utils.six.moves import input

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Membership
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


def create_adhoc_group_for_learners(classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name="", parent=classroom)
    for learner in learners:
        Membership.objects.create(user=learner, collection=adhoc_group)
    return adhoc_group


models_to_copy = [
    ContentSessionLog,
    ContentSummaryLog,
    MasteryLog,
    AttemptLog,
    UserSessionLog,
]

user_fields = [
    "gender",
    "birth_year",
    "id_number",
]

log_fields = {
    ContentSessionLog: [
        "content_id",
        "visitor_id",
        "channel_id",
        "start_timestamp",
        "end_timestamp",
        "time_spent",
        "progress",
        "kind",
        "extra_fields",
    ],
    ContentSummaryLog: [
        "content_id",
        "channel_id",
        "start_timestamp",
        "end_timestamp",
        "completion_timestamp",
        "time_spent",
        "progress",
        "kind",
        "extra_fields",
    ],
    UserSessionLog: [
        "channels",
        "start_timestamp",
        "last_interaction_timestamp",
        "pages",
        "device_info",
    ],
    MasteryLog: [
        "mastery_criterion",
        "start_timestamp",
        "end_timestamp",
        "completion_timestamp",
        "mastery_level",
        "complete",
        ("summarylog_id", ContentSummaryLog),
    ],
    AttemptLog: [
        "item",
        "start_timestamp",
        "end_timestamp",
        "completion_timestamp",
        "time_spent",
        "complete",
        "correct",
        "hinted",
        "answer",
        "simple_answer",
        "interaction_history",
        "error",
        ("masterylog_id", MasteryLog),
        ("sessionlog_id", ContentSessionLog),
    ],
}


def _merge_user_models(source_user, target_user):
    for f in user_fields:
        source_value = getattr(source_user, f, None)
        target_value = getattr(target_user, f, None)
        if not target_value and source_value:
            setattr(target_user, f, source_value)
    target_user.save()


def merge_users(source_user, target_user):
    """
    Utility to merge two users. It makes no assumptions about whether
    the users are in the same facility and does raw copies of all
    associated user data, rather than try to do anything clever.
    """
    if source_user.id == target_user.id:
        raise ValueError("Cannot merge a user with themselves")

    _merge_user_models(source_user, target_user)

    id_map = {}

    def _merge_log_data(source_user, target_user, LogModel):
        log_map = {}
        id_map[LogModel] = log_map
        for log in LogModel.objects.filter(user=source_user):
            data = {}
            for f in log_fields[LogModel]:
                if isinstance(f, tuple):
                    field_name, model = f
                    data[field_name] = id_map[model][getattr(log, field_name)]
                else:
                    data[f] = getattr(log, f)
            new_log = LogModel.objects.create(user=target_user, **data)
            log_map[log.id] = new_log.id

    _merge_log_data(source_user, target_user, ContentSessionLog)

    _merge_log_data(source_user, target_user, ContentSummaryLog)

    _merge_log_data(source_user, target_user, UserSessionLog)

    _merge_log_data(source_user, target_user, MasteryLog)

    _merge_log_data(source_user, target_user, AttemptLog)

    source_user.delete()
