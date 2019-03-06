import base64
import datetime
import hashlib
import json
import re

import semver
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models import Count
from django.db.models import Max
from django.db.models import Min
from django.db.models import Sum

from .models import PingbackNotification
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
    jsondata = json.dumps(data, sort_keys=True, cls=DjangoJSONEncoder)
    try:
        # perform the import in here as zlib isn't available on some platforms
        import zlib
        jsondata = zlib.compress(jsondata)
    except:  # noqa
        pass
    return jsondata


#  Copied from https://github.com/learningequality/nutritionfacts/commit/b33e19400ae639cbcf2b2e9b312d37493eb1e566#diff-5b7513e7bc7d64d348fd8d3f2222b573
#  TODO: move to le-utils package
def version_matches_range(version, version_range):

    # if no version range is provided, assume we don't have opinions about the version
    if not version_range or version_range == '*':
        return True

    # support having multiple comma-delimited version criteria
    if "," in version_range:
        return all([version_matches_range(version, vrange) for vrange in version_range.split(",")])

    # extract and normalize version strings
    operator, range_version = re.match(r"([<>=!]*)(\d.*)", version_range).groups()
    range_version = normalize_version_to_semver(range_version)
    version = normalize_version_to_semver(version)

    # check whether the version is in the range
    return semver.match(version, operator + range_version)


def normalize_version_to_semver(version):

    _, dev = re.match(r"(.*?)(\.dev.*)?$", version).groups()

    # extract the numeric semver component and the stuff that comes after
    numeric, after = re.match(r"(\d+\.\d+\.\d+)([^\d].*)?", version).groups()

    # clean up the different variations of the post-numeric component to ease checking
    after = (after or "").strip("-").strip("+").strip(".").split("+")[0]

    # split up the alpha/beta letters from the numbers, to sort numerically not alphabetically
    after_pieces = re.match(r"([a-z])(\d+)", after)
    if after_pieces:
        after = ".".join([piece for piece in after_pieces.groups() if piece])

    # position final releases between alphas, betas, and further dev
    if not dev:
        after = (after + ".c").strip(".")

    # make sure dev versions are sorted nicely relative to one another
    dev = (dev or "").replace("+", ".").replace("-", ".")

    return "{}-{}{}".format(numeric, after, dev).strip("-")


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

    # extract the first and last times we've seen logs, ignoring any that are None
    first_times = [d["first"] for d in [usersess_agg, contsess_agg] if d["first"]]
    last_times = [d["last"] for d in [usersess_agg, contsess_agg] if d["last"]]

    # since newly provisioned devices won't have logs, we don't know whether we have an available datetime object
    first_interaction_timestamp = getattr(min(first_times), 'strftime', None) if first_times else None
    last_interaction_timestamp = getattr(max(last_times), 'strftime', None) if last_times else None

    sesslogs_by_kind = contsessions.order_by("kind").values("kind").annotate(count=Count("kind"))
    sesslogs_by_kind = {log["kind"]: log["count"] for log in sesslogs_by_kind}

    summarylogs = ContentSummaryLog.objects.filter(dataset_id=dataset_id)

    contsessions_user = contsessions.exclude(user=None)
    contsessions_anon = contsessions.filter(user=None)

    return {
        # facility_id
        "fi": base64.encodestring(hashlib.md5(facility.id.encode()).digest())[:10].decode(),
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


@transaction.atomic
def create_and_update_notifications(data, source):
    messages = [obj for obj in data.get('messages', []) if obj.get('msg_id')]
    excluded_ids = [obj.get('msg_id') for obj in messages]
    PingbackNotification.objects.filter(source=source).exclude(id__in=excluded_ids).update(active=False)
    for msg in messages:
        new_msg = {
            'id': msg['msg_id'],
            'version_range': msg.get('version_range'),
            'link_url': msg.get('link_url'),
            'i18n': msg.get('i18n'),
            'timestamp': msg.get('timestamp'),
            'source': source,
            'active': True,
        }
        PingbackNotification.objects.update_or_create(id=new_msg['id'], defaults=new_msg)
