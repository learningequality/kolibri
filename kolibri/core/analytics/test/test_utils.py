from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import csv
import datetime
import hashlib
import io
import os
import random
import uuid

from django.test import TransactionTestCase
from le_utils.constants import content_kinds

from kolibri.core.analytics.constants.nutrition_endpoints import PINGBACK
from kolibri.core.analytics.constants.nutrition_endpoints import STATISTICS
from kolibri.core.analytics.models import PingbackNotification
from kolibri.core.analytics.utils import calculate_list_stats
from kolibri.core.analytics.utils import create_and_update_notifications
from kolibri.core.analytics.utils import encodestring
from kolibri.core.analytics.utils import extract_channel_statistics
from kolibri.core.analytics.utils import extract_facility_statistics
from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import facility_presets
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_single_user_device
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.logger.utils import user_data


USER_CSV_PATH = "kolibri/core/logger/management/commands/user_data.csv"


def mean(data):
    if data:
        return float(sum(data)) / len(data)
    return None


class BaseDeviceSetupMixin(object):
    n_facilities = 1
    n_superusers = 1
    n_users = 20  # 20 users x 1 facility = 20 users
    n_classes = 1  # 1 class x 1 facility = 1 class
    min_timestamp = datetime.datetime(2018, 10, 11)
    max_timestamp = datetime.datetime(2019, 10, 11)

    def setUp(self):
        super(BaseDeviceSetupMixin, self).setUp()
        # create dummy channel
        channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="root",
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        self.channel = ChannelMetadata.objects.create(
            id=channel_id, name="channel", last_updated=self.min_timestamp, root=root
        )
        lf = LocalFile.objects.create(
            id=uuid.uuid4().hex, available=True, file_size=1048576  # 1 MB
        )
        File.objects.create(id=uuid.uuid4().hex, contentnode=root, local_file=lf)

        # Load in the user data from the csv file to give a predictable source of user data
        data_path = os.path.join(USER_CSV_PATH)
        with io.open(data_path, mode="r", encoding="utf-8") as f:
            users = [data for data in csv.DictReader(f)]

        self.facilities = user_data.get_or_create_facilities(
            n_facilities=self.n_facilities
        )
        self.users = []

        for facility in self.facilities:
            dataset = facility.dataset
            # create superuser and login session
            for i in range(self.n_superusers):
                superuser = create_superuser(
                    facility=facility, username="superuser{}".format(i)
                )
                facility.add_role(superuser, role_kinds.ADMIN)
                UserSessionLog.objects.create(
                    user=superuser,
                    start_timestamp=self.min_timestamp,
                    last_interaction_timestamp=self.max_timestamp,
                )
                # create lesson and exam for facility
                Lesson.objects.create(
                    created_by=superuser, title="lesson", collection=facility
                )
                exam = Exam.objects.create(
                    creator=superuser,
                    title="exam",
                    question_count=1,
                    collection=facility,
                )
                exam_id = exam.id
            else:
                exam_id = uuid.uuid4().hex

            classrooms = user_data.get_or_create_classrooms(
                n_classes=self.n_classes, facility=facility
            )

            # Get all the user data at once so that it is distinct across classrooms
            facility_user_data = random.sample(users, self.n_classes * self.n_users)

            # create random content id for the session logs
            self.content_id = uuid.uuid4().hex
            for i, classroom in enumerate(classrooms):
                classroom_user_data = facility_user_data[
                    i * self.n_users : (i + 1) * self.n_users
                ]
                users = user_data.get_or_create_classroom_users(
                    n_users=self.n_users,
                    classroom=classroom,
                    user_data=classroom_user_data,
                    facility=facility,
                )
                self.users.extend(users)
                # create 1 of each type of log per user
                for user in users:
                    for _ in range(1):
                        sessionlog = ContentSessionLog.objects.create(
                            user=user,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            content_id=self.content_id,
                            channel_id=self.channel.id,
                            time_spent=60,  # 1 minute
                            kind=content_kinds.EXERCISE,
                        )
                        AttemptLog.objects.create(
                            item="item",
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            completion_timestamp=self.max_timestamp,
                            correct=1,
                            sessionlog=sessionlog,
                        )
                        # create 1 anon log per user session log
                        ContentSessionLog.objects.create(
                            dataset=dataset,
                            user=None,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            content_id=self.content_id,
                            channel_id=self.channel.id,
                            time_spent=60,  # 1 minute,
                            kind=content_kinds.VIDEO,
                        )
                    for _ in range(1):
                        UserSessionLog.objects.create(
                            user=user,
                            start_timestamp=self.min_timestamp,
                            last_interaction_timestamp=self.max_timestamp,
                            device_info="Android,9/Chrome Mobile,86",
                        )
                    for _ in range(1):
                        ContentSummaryLog.objects.create(
                            user=user,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            completion_timestamp=self.max_timestamp,
                            content_id=uuid.uuid4().hex,
                            channel_id=self.channel.id,
                        )
                    for _ in range(1):
                        sl = ContentSessionLog.objects.create(
                            user=user,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            content_id=exam_id,
                            channel_id=None,
                            time_spent=60,  # 1 minute
                            kind=content_kinds.QUIZ,
                        )
                        summarylog = ContentSummaryLog.objects.create(
                            user=user,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            completion_timestamp=self.max_timestamp,
                            content_id=exam_id,
                            channel_id=None,
                            kind=content_kinds.QUIZ,
                        )
                        masterylog = MasteryLog.objects.create(
                            mastery_criterion={"type": "quiz", "coach_assigned": True},
                            summarylog=summarylog,
                            start_timestamp=summarylog.start_timestamp,
                            user=user,
                            mastery_level=-1,
                        )
                        AttemptLog.objects.create(
                            masterylog=masterylog,
                            sessionlog=sl,
                            start_timestamp=self.min_timestamp,
                            end_timestamp=self.max_timestamp,
                            completion_timestamp=self.max_timestamp,
                            correct=1,
                            item="test:test",
                        )

    def tearDown(self):
        super(BaseDeviceSetupMixin, self).tearDown()
        DeviceSettings.objects.all().delete()


class FacilityStatisticsTestCase(BaseDeviceSetupMixin, TransactionTestCase):
    def test_extract_facility_statistics(self):
        provision_device(allow_guest_access=True)
        facility = self.facilities[0]
        actual = extract_facility_statistics(facility)
        facility_id_hash = actual.pop("fi")
        birth_year_list_learners = [
            int(year)
            for year in FacilityUser.objects.filter(roles__isnull=True).values_list(
                "birth_year", flat=True
            )
        ]
        # just assert the beginning hex values of the facility id don't match
        self.assertFalse(facility_id_hash.startswith(facility.id[:3]))
        demo_stats = calculate_list_stats(birth_year_list_learners)
        expected = {
            "s": {
                "preset": facility_presets.default,
                "learner_can_edit_username": True,
                "learner_can_edit_name": True,
                "learner_can_edit_password": True,
                "learner_can_sign_up": True,
                "learner_can_delete_account": True,
                "learner_can_login_with_no_password": False,
                "show_download_button_in_learn": True,
                "allow_guest_access": True,
                "registered": False,
            },
            "lc": 20,  # learners_count
            "llc": 20,  # learner_login_count
            "cc": 1,  # coaches_count
            "clc": 1,  # coach_login_count
            "f": "2018-10-11",  # first interaction
            "l": "2019-10-11",  # last interaction
            "ss": 40,  # summarylog_started
            "sc": 40,  # summarylog_complete
            "sk": {
                content_kinds.EXERCISE: 20,
                content_kinds.VIDEO: 20,
                content_kinds.QUIZ: 20,
            },  # sess_kinds
            "lec": 1,  # lesson_count
            "ec": 1,  # exam_count
            "elc": 20,  # exam_log_count
            "alc": 20,  # att_log_count
            "ealc": 20,  # exam_att_log_count
            "suc": 40,  # sess_user_count
            "sac": 20,  # sess_anon_count
            "sut": 40,  # sess_user_time
            "sat": 20,  # sess_anon_time
            "dsl": {
                "bys": {
                    "a": demo_stats["mean"],
                    "sd": demo_stats["std"],
                    "ts": 20,
                    "d": 0,
                    "ns": 0,
                },
                "gc": {
                    gender: FacilityUser.objects.filter(gender=gender).count()
                    for (gender, _) in demographics.choices
                    if FacilityUser.objects.filter(gender=gender).exists()
                },
            },  # demographic_stats_learner
            "dsnl": {},  # demographic_stats_non_learner
            "crc": 1,  # class_count
            "grc": 0,  # group_count
            "sacnv": 20,  # sess_anon_count_no_visitor_id
            "uwl": 20,  # users_with_logs
            "vwl": 0,  # anon_visitors_with_logs
            "dis": {"Android,9/Chrome Mobile,86": 20},  # device info
        }

        assert actual == expected
        self.assertNotIn("sh", actual)

    def test_regression_4606_no_usersessions(self):
        UserSessionLog.objects.all().delete()
        facility = self.facilities[0]
        # will raise an exception if we haven't addressed https://github.com/learningequality/kolibri/issues/4606
        actual = extract_facility_statistics(facility)
        assert actual["f"] == "2018-10-11"
        assert actual["l"] == "2019-10-11"

    def test_regression_4606_no_contentsessions(self):
        ContentSessionLog.objects.all().delete()
        facility = self.facilities[0]
        # will raise an exception if we haven't addressed https://github.com/learningequality/kolibri/issues/4606
        actual = extract_facility_statistics(facility)
        assert actual["f"] == "2018-10-11"
        assert actual["l"] == "2019-10-11"

    def test_regression_4606_no_contentsessions_or_usersessions(self):
        ContentSessionLog.objects.all().delete()
        UserSessionLog.objects.all().delete()
        facility = self.facilities[0]
        # will raise an exception if we haven't addressed https://github.com/learningequality/kolibri/issues/4606
        actual = extract_facility_statistics(facility)
        assert actual["f"] is None
        assert actual["l"] is None


class SoudFacilityStatisticsTestCase(BaseDeviceSetupMixin, TransactionTestCase):
    n_facilities = 1
    n_superusers = 0
    n_users = 2

    def test_extract_facility_statistics__soud_hash(self):
        provision_single_user_device(self.users[0])
        facility = self.facilities[0]
        actual = extract_facility_statistics(facility)
        users = sorted(self.users, key=lambda u: u.id)
        user_ids = ":".join([user.id for user in users])
        expected_soud_hash = encodestring(hashlib.md5(user_ids.encode()).digest())[
            :10
        ].decode()
        self.assertEqual(expected_soud_hash, actual.pop("sh"))


class ChannelStatisticsTestCase(BaseDeviceSetupMixin, TransactionTestCase):
    def test_extract_channel_statistics(self):
        actual = extract_channel_statistics(self.channel)
        birth_year_list_learners = [
            int(year)
            for year in FacilityUser.objects.filter(
                roles__isnull=True, contentsummarylog__channel_id=self.channel.id
            ).values_list("birth_year", flat=True)
        ]
        demo_stats = calculate_list_stats(birth_year_list_learners)
        expected = {
            "ci": self.channel.id[:10],  # channel_id
            "v": 0,  # version
            "u": "2018-10-11",  # updated
            "pi": [self.content_id[:10]],  # popular_ids
            "pc": [40],  # popular_counts
            "s": 1,  # storage
            "ss": 20,  # summ_started
            "sc": 20,  # summ_complete
            "sk": {content_kinds.EXERCISE: 20, content_kinds.VIDEO: 20},  # sess_kinds
            "suc": 20,  # sess_user_count
            "sac": 20,  # sess_anon_count
            "sut": 20,  # sess_user_time
            "sat": 20,  # sess_anon_time
            "dsl": {
                "bys": {
                    "a": demo_stats["mean"],
                    "sd": demo_stats["std"],
                    "ts": 20,
                    "d": 0,
                    "ns": 0,
                },
                "gc": {
                    gender: FacilityUser.objects.filter(
                        contentsummarylog__channel_id=self.channel.id, gender=gender
                    ).count()
                    for (gender, _) in demographics.choices
                    if FacilityUser.objects.filter(gender=gender).exists()
                },
            },  # demographic_stats_learner
            "dsnl": {},  # demographic_stats_non_learner
            "sacnv": 20,  # sess_anon_count_no_visitor_id
            "uwl": 20,  # users_with_logs
            "vwl": 0,  # anon_visitors_with_logs
        }
        assert actual == expected


class CreateUpdateNotificationsTestCase(TransactionTestCase):
    def setUp(self):
        self.msg = {
            "i18n": {},
            "msg_id": "ping",
            "link_url": "le.org",
            "timestamp": datetime.date(2012, 12, 12),
            "version_range": "<1.0.0",
        }
        self.messages = {"messages": []}
        self.data = {
            "i18n": {},
            "id": "message",
            "link_url": "le.org",
            "timestamp": datetime.date(2012, 12, 12),
            "version_range": "<1.0.0",
            "source": PINGBACK,
        }
        PingbackNotification.objects.create(**self.data)

    def test_no_messages_still_updates(self):
        create_and_update_notifications(self.messages, PINGBACK)
        self.assertFalse(PingbackNotification.objects.get(id="message").active)

    def test_create_and_update_notification(self):
        self.messages["messages"].append(self.msg)
        original_count = PingbackNotification.objects.count()
        create_and_update_notifications(self.messages, PINGBACK)
        # deactivate all other messages, for this source, not included in response
        self.assertFalse(PingbackNotification.objects.get(id="message").active)
        self.assertEqual(PingbackNotification.objects.count(), original_count + 1)

    def test_update_same_notification(self):
        self.data["msg_id"] = self.data["id"]
        self.data["link_url"] = ""
        pre_notification = PingbackNotification.objects.get(id="message")
        self.messages["messages"].append(self.data)
        create_and_update_notifications(self.messages, PINGBACK)
        post_notification = PingbackNotification.objects.get(id="message")
        # messages with same ID are overwritten
        self.assertTrue(post_notification.active)
        self.assertNotEqual(pre_notification.link_url, post_notification.link_url)

    def test_update_other_source(self):
        self.messages["messages"].append(self.msg)
        create_and_update_notifications(self.messages, STATISTICS)
        # messages from other source should not be modified
        self.assertFalse(
            PingbackNotification.objects.filter(source=PINGBACK, active=False).exists()
        )
