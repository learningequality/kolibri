from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import csv
import datetime
import io
import os
import random
import uuid

from django.test import TestCase
from le_utils.constants import content_kinds

from kolibri.core.analytics.utils import extract_channel_statistics
from kolibri.core.analytics.utils import extract_facility_statistics
from kolibri.core.auth.constants import facility_presets
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.logger.utils import user_data


USER_CSV_PATH = "kolibri/core/logger/management/commands/user_data.csv"


class BaseDeviceSetupMixin(object):

    def setUp(self):
        # create dummy channel
        channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title='root',
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
        )
        min_timestamp = datetime.datetime(2018, 10, 11)
        self.channel = ChannelMetadata.objects.create(
            id=channel_id,
            name='channel',
            last_updated=min_timestamp,
            root=root
        )
        lf = LocalFile.objects.create(
            id=uuid.uuid4().hex,
            available=True,
            file_size=1048576  # 1 MB
        )
        File.objects.create(
            id=uuid.uuid4().hex,
            contentnode=root,
            local_file=lf,
        )

        # Load in the user data from the csv file to give a predictable source of user data
        data_path = os.path.join(USER_CSV_PATH)
        with io.open(data_path, mode='r', encoding='utf-8') as f:
            users = [data for data in csv.DictReader(f)]

        n_facilities = 1
        n_classes = 1  # 1 class x 1 facility = 1 class
        n_users = 20  # 20 users x 1 facility = 20 users
        max_timestamp = datetime.datetime(2019, 10, 11)

        self.facilities = user_data.get_or_create_facilities(n_facilities=n_facilities)
        for facility in self.facilities:
            dataset = facility.dataset
            # create superuser and login session
            superuser = create_superuser(facility=facility)
            facility.add_role(superuser, role_kinds.ADMIN)
            UserSessionLog.objects.create(
                user=superuser,
                start_timestamp=min_timestamp,
                last_interaction_timestamp=max_timestamp,
            )
            # create lesson and exam for facility
            Lesson.objects.create(
                created_by=superuser,
                title='lesson',
                collection=facility,
            )
            exam = Exam.objects.create(
                creator=superuser,
                title='exam',
                question_count=1,
                collection=facility,
            )

            classrooms = user_data.get_or_create_classrooms(
                n_classes=n_classes,
                facility=facility,
            )

            # Get all the user data at once so that it is distinct across classrooms
            facility_user_data = random.sample(users, n_classes * n_users)

            # create random content id for the session logs
            self.content_id = uuid.uuid4().hex
            for i, classroom in enumerate(classrooms):
                classroom_user_data = facility_user_data[i * n_users: (i + 1) * n_users]
                users = user_data.get_or_create_classroom_users(
                    n_users=n_users,
                    classroom=classroom,
                    user_data=classroom_user_data,
                    facility=facility
                )
                # create 1 of each type of log per user
                for user in users:
                    for _ in range(1):
                        sessionlog = ContentSessionLog.objects.create(
                            user=user,
                            start_timestamp=min_timestamp,
                            end_timestamp=max_timestamp,
                            content_id=self.content_id,
                            channel_id=self.channel.id,
                            time_spent=60,  # 1 minute
                            kind=content_kinds.EXERCISE,
                        )
                        AttemptLog.objects.create(
                            item='item',
                            start_timestamp=min_timestamp,
                            end_timestamp=max_timestamp,
                            completion_timestamp=max_timestamp,
                            correct=1,
                            sessionlog=sessionlog,
                        )
                        # create 1 anon log per user session log
                        ContentSessionLog.objects.create(
                            dataset=dataset,
                            user=None,
                            start_timestamp=min_timestamp,
                            end_timestamp=max_timestamp,
                            content_id=self.content_id,
                            channel_id=self.channel.id,
                            time_spent=60,  # 1 minute,
                            kind=content_kinds.VIDEO,
                        )
                    for _ in range(1):
                        UserSessionLog.objects.create(
                            user=user,
                            start_timestamp=min_timestamp,
                            last_interaction_timestamp=max_timestamp,
                        )
                    for _ in range(1):
                        ContentSummaryLog.objects.create(
                            user=user,
                            start_timestamp=min_timestamp,
                            end_timestamp=max_timestamp,
                            completion_timestamp=max_timestamp,
                            content_id=uuid.uuid4().hex,
                            channel_id=self.channel.id,
                        )
                    for _ in range(1):
                        examlog = ExamLog.objects.create(
                            exam=exam,
                            user=user,
                        )
                        ExamAttemptLog.objects.create(
                            examlog=examlog,
                            start_timestamp=min_timestamp,
                            end_timestamp=max_timestamp,
                            completion_timestamp=max_timestamp,
                            correct=1,
                            content_id=uuid.uuid4().hex,
                            channel_id=self.channel.id,
                        )


class FacilityStatisticsTestCase(BaseDeviceSetupMixin, TestCase):

    def test_extract_facility_statistics(self):
        facility = self.facilities[0]
        actual = extract_facility_statistics(facility)
        facility_id_hash = actual.pop('fi')
        # just assert the beginning hex values of the facility id don't match
        self.assertFalse(facility_id_hash.startswith(facility.id[:3].encode()))
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
            },
            "lc": 20,  # learners_count
            "llc": 20,  # learner_login_count
            "cc": 1,  # coaches_count
            "clc": 1,  # coach_login_count
            "f" : "2018-10-11",  # first interaction
            "l": "2019-10-11",  # last interaction
            "ss": 20,  # summarylog_started
            "sc": 20,  # summarylog_complete
            "sk": {content_kinds.EXERCISE: 20, content_kinds.VIDEO: 20},  # sess_kinds
            "lec": 1,  # lesson_count
            "ec": 1,  # exam_count
            "elc": 20,  # exam_log_count
            "alc": 20,  # att_log_count
            "ealc": 20,  # exam_att_log_count
            "suc": 20,  # sess_user_count
            "sac": 20,  # sess_anon_count
            "sut": 20,  # sess_user_time
            "sat": 20,  # sess_anon_time
        }
        assert actual == expected


class ChannelStatisticsTestCase(BaseDeviceSetupMixin, TestCase):

    def test_extract_channel_statistics(self):
        actual = extract_channel_statistics(self.channel)
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
        }
        assert actual == expected
