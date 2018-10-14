import base64
import datetime
import hashlib
import json

from django.db.models import Count
from django.db.models import Max
from django.db.models import Min
from django.db.models import Sum

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import LocalFile
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import UserSessionLog

facility_settings = [
    "preset",
    "learner_can_edit_username",
    "learner_can_edit_name",
    "learner_can_edit_password",
    "learner_can_sign_up",
    "learner_can_delete_account",
    "learner_can_login_with_no_password",
    "show_download_button_in_learn",
    "allow_guest_access",
]


def dump_zipped_json(data):
    jsondata = json.dumps(data)
    try:
        # perform the import in here as zlib isn't available on some platforms
        import zlib
        jsondata = zlib.compress(jsondata)
    except:  # noqa
        pass
    return jsondata


def extract_facility_statistics(facility):

    dataset_id = facility.dataset_id

    settings = {name: getattr(facility.dataset, name) for name in facility_settings if hasattr(facility.dataset, name)}

    learners = FacilityUser.objects.filter(dataset_id=dataset_id).exclude(roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH])
    coaches = FacilityUser.objects.filter(dataset_id=dataset_id, roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH])

    usersessions = UserSessionLog.objects.filter(dataset_id=dataset_id)
    contsessions = ContentSessionLog.objects.filter(dataset_id=dataset_id, time_spent__lt=3600 * 2)

    # the aggregates below are used to calculate the first and most recent times this device was used
    usersess_agg = (usersessions
                    .filter(start_timestamp__gt=datetime.datetime(2016, 1, 1))
                    .aggregate(first=Min("start_timestamp"), last=Max("last_interaction_timestamp")))
    contsess_agg = (contsessions
                    .filter(start_timestamp__gt=datetime.datetime(2016, 1, 1))
                    .aggregate(first=Min("start_timestamp"), last=Max("end_timestamp")))

    # since newly provisioned devices won't have logs, we don't know whether we have an available datetime object
    first_interaction_timestamp = getattr(min(usersess_agg["first"], contsess_agg["first"]), 'strftime', None)
    last_interaction_timestamp = getattr(max(usersess_agg["last"], contsess_agg["last"]), 'strftime', None)

    sesslogs_by_kind = contsessions.order_by("kind").values("kind").annotate(count=Count("kind"))
    sesslogs_by_kind = {log["kind"]: log["count"] for log in sesslogs_by_kind}

    summarylogs = ContentSummaryLog.objects.filter(dataset_id=dataset_id)

    contsessions_user = contsessions.exclude(user=None)
    contsessions_anon = contsessions.filter(user=None)

    return {
        # facility_id
        "fi": base64.encodestring(hashlib.md5(facility.id.encode()).digest())[:10],
        # settings
        "s": settings,
        # learners_count
        "lc": learners.count(),
        # learner_login_count
        "llc": usersessions.exclude(user__roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH]).distinct().count(),
        # coaches_count
        "cc": coaches.count(),
        # coach_login_count
        "clc": usersessions.filter(user__roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH]).distinct().count(),
        # first
        "f" : first_interaction_timestamp("%Y-%m-%d") if first_interaction_timestamp else None,
        # last
        "l": last_interaction_timestamp("%Y-%m-%d") if last_interaction_timestamp else None,
        # summ_started
        "ss": summarylogs.count(),
        # summ_complete
        "sc": summarylogs.exclude(completion_timestamp=None).count(),
        # sess_kinds
        "sk": sesslogs_by_kind,
        # lesson_count
        "lec": Lesson.objects.filter(dataset_id=dataset_id).count(),
        # exam_count
        "ec": Exam.objects.filter(dataset_id=dataset_id).count(),
        # exam_log_count
        "elc": ExamLog.objects.filter(dataset_id=dataset_id).count(),
        # att_log_count
        "alc": AttemptLog.objects.filter(dataset_id=dataset_id).count(),
        # exam_att_log_count
        "ealc": ExamAttemptLog.objects.filter(dataset_id=dataset_id).count(),
        # sess_user_count
        "suc": contsessions_user.count(),
        # sess_anon_count
        "sac": contsessions_anon.count(),
        # sess_user_time
        "sut": int((contsessions_user.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # sess_anon_time
        "sat": int((contsessions_anon.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
    }


def extract_channel_statistics(channel):

    channel_id = channel.id
    tree_id = channel.root.tree_id

    sessionlogs = ContentSessionLog.objects.filter(channel_id=channel_id, time_spent__lt=3600 * 2)
    summarylogs = ContentSummaryLog.objects.filter(channel_id=channel_id)

    sesslogs_by_kind = sessionlogs.order_by("kind").values("kind").annotate(count=Count("kind"))
    sesslogs_by_kind = {log["kind"]: log["count"] for log in sesslogs_by_kind}

    pop = list(sessionlogs.values("content_id").annotate(count=Count("id")).order_by("-count")[:50])

    localfiles = LocalFile.objects.filter(available=True, files__contentnode__tree_id=tree_id).distinct()

    contsessions_user = sessionlogs.exclude(user=None)
    contsessions_anon = sessionlogs.filter(user=None)

    return {
        # channel_id
        "ci": channel_id[:10],
        # version
        "v": channel.version,
        # updated
        "u": channel.last_updated.strftime("%Y-%m-%d") if channel.last_updated else None,
        # popular_ids
        "pi": [item["content_id"][:10] for item in pop],
        # popular_counts
        "pc": [item["count"] for item in pop],
        # storage calculated by the MB
        "s": (localfiles.aggregate(Sum("file_size"))["file_size__sum"] or 0) / (2 ** 20),
        # summ_started
        "ss": summarylogs.count(),
        # summ_complete
        "sc": summarylogs.exclude(completion_timestamp=None).count(),
        # sess_kinds
        "sk": sesslogs_by_kind,
        # sess_user_count
        "suc": contsessions_user.count(),
        # sess_anon_count
        "sac": contsessions_anon.count(),
        # sess_user_time
        "sut": int((contsessions_user.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # sess_anon_time
        "sat": int((contsessions_anon.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
    }
