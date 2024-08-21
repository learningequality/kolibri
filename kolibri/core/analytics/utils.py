import base64
import datetime
import hashlib
import json
import logging
import math

from dateutil import parser
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models import Count
from django.db.models import Max
from django.db.models import Min
from django.db.models import Q
from django.db.models import Sum
from django.utils.timezone import get_current_timezone
from django.utils.timezone import localtime
from le_utils.constants import content_kinds
from morango.models import InstanceIDModel

import kolibri
from .constants import nutrition_endpoints
from .models import PingbackNotification
from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import LocalFile
from kolibri.core.device.utils import allow_guest_access
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.utils.lock import db_lock
from kolibri.utils import conf
from kolibri.utils.server import installation_type
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


DEFAULT_SERVER_URL = "https://telemetry.learningequality.org"

USER_THRESHOLD = 10

facility_settings = [
    "preset",
    "learner_can_edit_username",
    "learner_can_edit_name",
    "learner_can_edit_password",
    "learner_can_sign_up",
    "learner_can_delete_account",
    "learner_can_login_with_no_password",
    "show_download_button_in_learn",
    "registered",
]


def calculate_list_stats(data):
    if data:
        results = {}
        results["count"] = len(data)
        # calculate mean
        results["mean"] = float(sum(data)) / results["count"]
        # calculate std
        results["std"] = round(
            math.sqrt(sum((d - results["mean"]) ** 2 for d in data) / results["count"]),
            2,
        )
        return results
    return {"count": None, "mean": None, "std": None}


def calculate_demographic_stats(dataset_id=None, channel_id=None, learners=True):

    stats = {}

    # if learners=True, only include learners, otherwise only non-learners
    roles_filter = Q(roles__isnull=learners)
    queryset = FacilityUser.objects.filter(roles_filter)

    # handle stats at facility level
    if dataset_id:
        queryset = queryset.filter(dataset_id=dataset_id)

    # handle stats at channel level
    if channel_id:
        user_ids = (
            queryset.filter(contentsummarylog__channel_id=channel_id)
            .distinct()
            .values_list("id", flat=True)
        )
        # pass distinct user_ids as subquery
        queryset = FacilityUser.objects.filter(id__in=user_ids)

    # calculate stats if there are USER_THRESHOLD users or more
    if queryset.count() >= USER_THRESHOLD:
        # get list of all birth years
        list_of_birth_years = list(queryset.values_list("birth_year", flat=True))

        # calculate all gender counts
        gender_counts = queryset.values("gender").annotate(count=Count("gender"))

        year_stats = calculate_list_stats(
            [int(year) for year in list_of_birth_years if year.isdigit()]
        )

        # payload of birth year and gender statistics
        stats = {
            "bys": {
                "a": year_stats["mean"],
                "sd": year_stats["std"],
                "ts": year_stats["count"],
                "d": list_of_birth_years.count(demographics.DEFERRED),
                "ns": list_of_birth_years.count(demographics.NOT_SPECIFIED),
            },
            "gc": {
                gc["gender"]: gc["count"] for gc in gender_counts if gc["gender"] != ""
            },
        }
    return stats


def dump_zipped_json(data):
    jsondata = json.dumps(data, sort_keys=True, cls=DjangoJSONEncoder)
    try:
        # perform the import in here as zlib isn't available on some platforms
        import zlib

        jsondata = zlib.compress(jsondata)
    except:  # noqa
        pass
    return jsondata


def extract_facility_statistics(facility):

    dataset_id = facility.dataset_id

    settings = {
        name: getattr(facility.dataset, name)
        for name in facility_settings
        if hasattr(facility.dataset, name)
    }

    settings.update(allow_guest_access=allow_guest_access())

    learners = FacilityUser.objects.filter(dataset_id=dataset_id).exclude(
        roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH]
    )
    coaches = FacilityUser.objects.filter(
        dataset_id=dataset_id, roles__kind__in=[role_kinds.ADMIN, role_kinds.COACH]
    )

    usersessions = UserSessionLog.objects.filter(dataset_id=dataset_id)
    contsessions = ContentSessionLog.objects.filter(
        dataset_id=dataset_id, time_spent__lt=3600 * 2
    )

    # the aggregates below are used to calculate the first and most recent times this device was used
    usersess_agg = usersessions.filter(
        start_timestamp__gt=datetime.datetime(2016, 1, 1)
    ).aggregate(first=Min("start_timestamp"), last=Max("last_interaction_timestamp"))
    contsess_agg = contsessions.filter(
        start_timestamp__gt=datetime.datetime(2016, 1, 1)
    ).aggregate(first=Min("start_timestamp"), last=Max("end_timestamp"))

    # extract the first and last times we've seen logs, ignoring any that are None
    first_times = [d["first"] for d in [usersess_agg, contsess_agg] if d["first"]]
    last_times = [d["last"] for d in [usersess_agg, contsess_agg] if d["last"]]

    # since newly provisioned devices won't have logs, we don't know whether we have an available datetime object
    first_interaction_timestamp = (
        getattr(min(first_times), "strftime", None) if first_times else None
    )
    last_interaction_timestamp = (
        getattr(max(last_times), "strftime", None) if last_times else None
    )

    sesslogs_by_kind = (
        contsessions.order_by("kind").values("kind").annotate(count=Count("kind"))
    )
    sesslogs_by_kind = {log["kind"]: log["count"] for log in sesslogs_by_kind}

    usersess_devinf = (
        usersessions.values("device_info")
        .exclude(device_info="")
        .exclude(device_info__isnull=True)
        .annotate(count=Count("device_info"))
    )
    usersess_devinf = {
        devinf["device_info"]: devinf["count"] for devinf in usersess_devinf
    }

    summarylogs = ContentSummaryLog.objects.filter(dataset_id=dataset_id)

    contsessions_user = contsessions.exclude(user=None)
    contsessions_anon = contsessions.filter(user=None)
    contsessions_anon_no_visitor_id = contsessions_anon.filter(visitor_id=None)
    contsessions_anon_with_visitor_id = contsessions_anon.exclude(visitor_id=None)

    users_with_logs = contsessions_user.values("user_id").distinct().count()
    anon_visitors_with_logs = (
        contsessions_anon_with_visitor_id.values("visitor_id").distinct().count()
    )

    # calculate learner stats
    learner_demographics = calculate_demographic_stats(
        dataset_id=dataset_id, learners=True
    )

    # calculate non-learner stats
    non_learner_demographics = calculate_demographic_stats(
        dataset_id=dataset_id, learners=False
    )

    # fmt: off
    data = {
        # facility_id
        "fi": base64.encodebytes(hashlib.md5(facility.id.encode()).digest())[:10].decode(),
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
        # users_with_logs
        "uwl": users_with_logs,
        # anon_visitors_with_logs
        "vwl": anon_visitors_with_logs,
        # device info stats
        "dis": usersess_devinf,
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
        # class_count
        "crc": Classroom.objects.filter(dataset_id=dataset_id).count(),
        # group_count
        "grc": LearnerGroup.objects.filter(dataset_id=dataset_id).count(),
        # lesson_count
        "lec": Lesson.objects.filter(dataset_id=dataset_id).count(),
        # exam_count
        "ec": Exam.objects.filter(dataset_id=dataset_id).count(),
        # exam_log_count
        "elc": MasteryLog.objects.filter(dataset_id=dataset_id, summarylog__kind=content_kinds.QUIZ).count(),
        # att_log_count
        "alc": AttemptLog.objects.filter(dataset_id=dataset_id).exclude(sessionlog__kind=content_kinds.QUIZ).count(),
        # exam_att_log_count
        "ealc": AttemptLog.objects.filter(dataset_id=dataset_id, sessionlog__kind=content_kinds.QUIZ).count(),
        # sess_user_count
        "suc": contsessions_user.count(),
        # sess_anon_count
        "sac": contsessions_anon.count(),
        # sess_anon_count_no_visitor_id
        "sacnv": contsessions_anon_no_visitor_id.count(),
        # sess_user_time
        "sut": int((contsessions_user.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # sess_anon_time
        "sat": int((contsessions_anon.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # demographic_stats_learner
        "dsl": learner_demographics,
        # demographic_stats_non_learner
        "dsnl": non_learner_demographics,
    }
    # fmt: on

    # conditionally calculate and add soud_hash
    if get_device_setting("subset_of_users_device"):
        user_ids = ":".join(
            facility.facilityuser_set.order_by("id").values_list("id", flat=True)
        )
        # soud_hash
        data["sh"] = base64.encodebytes(hashlib.md5(user_ids.encode()).digest())[
            :10
        ].decode()

    return data


def extract_channel_statistics(channel):

    channel_id = channel.id
    tree_id = channel.root.tree_id

    sessionlogs = ContentSessionLog.objects.filter(
        channel_id=channel_id, time_spent__lt=3600 * 2
    )
    summarylogs = ContentSummaryLog.objects.filter(channel_id=channel_id)

    sesslogs_by_kind = (
        sessionlogs.order_by("kind").values("kind").annotate(count=Count("kind"))
    )
    sesslogs_by_kind = {log["kind"]: log["count"] for log in sesslogs_by_kind}

    pop = list(
        sessionlogs.values("content_id")
        .annotate(count=Count("id"))
        .order_by("-count")[:50]
    )

    localfiles = LocalFile.objects.filter(
        available=True, files__contentnode__tree_id=tree_id
    ).distinct()

    contsessions_user = sessionlogs.exclude(user=None)
    contsessions_anon = sessionlogs.filter(user=None)
    contsessions_anon_no_visitor_id = contsessions_anon.filter(visitor_id=None)
    contsessions_anon_with_visitor_id = contsessions_anon.exclude(visitor_id=None)

    users_with_logs = contsessions_user.values("user_id").distinct().count()
    anon_visitors_with_logs = (
        contsessions_anon_with_visitor_id.values("visitor_id").distinct().count()
    )

    # calculate learner stats
    learner_demographics = calculate_demographic_stats(
        channel_id=channel_id, learners=True
    )

    # calculate non-learner stats
    non_learner_demographics = calculate_demographic_stats(
        channel_id=channel_id, learners=False
    )

    # fmt: off
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
        # job_storage calculated by the MB
        # rtibbles: This is the one remaining instance of non-SI bytes units calculations that
        # I have discovered still extant in Kolibri. As this is being used for statistics reporting
        # I have not updated it to use SI units as with all other instances, as that would
        # produce undesirable inconsistencies in reported statistics.
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
        # sess_anon_count_no_visitor_id
        "sacnv": contsessions_anon_no_visitor_id.count(),
        # sess_user_time
        "sut": int((contsessions_user.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # sess_anon_time
        "sat": int((contsessions_anon.aggregate(total_time=Sum("time_spent"))["total_time"] or 0) / 60),
        # users_with_logs
        "uwl": users_with_logs,
        # anon_visitors_with_logs
        "vwl": anon_visitors_with_logs,
        # demographic_stats_learner
        "dsl": learner_demographics,
        # demographic_stats_non_learner
        "dsnl": non_learner_demographics,
    }
    # fmt: on


@transaction.atomic
def create_and_update_notifications(data, source):
    messages = [obj for obj in data.get("messages", []) if obj.get("msg_id")]
    excluded_ids = [obj.get("msg_id") for obj in messages]
    with db_lock():
        PingbackNotification.objects.filter(source=source).exclude(
            id__in=excluded_ids
        ).update(active=False)

    for msg in messages:
        new_msg = {
            "id": msg["msg_id"],
            "version_range": msg.get("version_range"),
            "link_url": msg.get("link_url"),
            "i18n": msg.get("i18n"),
            "timestamp": msg.get("timestamp"),
            "source": source,
            "active": True,
        }
        with db_lock():
            PingbackNotification.objects.update_or_create(
                id=new_msg["id"], defaults=new_msg
            )


def perform_ping(started, server=DEFAULT_SERVER_URL):

    client = NetworkClient(server)

    url = "/api/v1/pingback"

    instance, _ = InstanceIDModel.get_or_create_current_instance()

    language = get_device_setting("language_id") or ""

    started = parser.isoparse(started)

    try:
        timezone = get_current_timezone().zone
    except Exception:
        timezone = ""

    data = {
        "instance_id": instance.id,
        "version": kolibri.__version__,
        "mode": conf.OPTIONS["Deployment"]["RUN_MODE"],
        "project": conf.OPTIONS["Deployment"]["PROJECT"],
        "platform": instance.platform,
        "sysversion": instance.sysversion,
        "database_id": instance.database.id,
        "system_id": instance.system_id,
        "node_id": instance.node_id,
        "language": language,
        "timezone": timezone,
        "uptime": int((local_now() - started).total_seconds() / 60),
        "timestamp": localtime(),
        "installer": installation_type(),
    }

    logger.debug("Pingback data: {}".format(data))
    jsondata = dump_zipped_json(data)
    response = client.post(url, data=jsondata, timeout=60)
    return json.loads(response.content.decode() or "{}")


def perform_statistics(server, pingback_id):
    client = NetworkClient(server)
    url = "/api/v1/statistics"
    channels = [extract_channel_statistics(c) for c in ChannelMetadata.objects.all()]
    facilities = [extract_facility_statistics(f) for f in Facility.objects.all()]
    data = {"pi": pingback_id, "c": channels, "f": facilities}
    logger.debug("Statistics data: {}".format(data))
    jsondata = dump_zipped_json(data)
    response = client.post(url, data=jsondata, timeout=60)
    return json.loads(response.content.decode() or "{}")


def ping_once(started, server=DEFAULT_SERVER_URL):
    data = perform_ping(started, server=server)
    logger.info("Ping succeeded! (response: {})".format(data))
    create_and_update_notifications(data, nutrition_endpoints.PINGBACK)
    if "id" in data:
        stat_data = perform_statistics(server, data["id"])
        create_and_update_notifications(stat_data, nutrition_endpoints.STATISTICS)
