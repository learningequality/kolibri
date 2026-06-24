import datetime
import uuid

from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons import models
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.helpers import EvaluationMixin
from kolibri.core.notifications.models import HelpReason
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
from kolibri.plugins.coach.viewsets.class_summary import COMPLETED
from kolibri.plugins.coach.viewsets.class_summary import content_status_serializer
from kolibri.plugins.coach.viewsets.class_summary import HELP_NEEDED
from kolibri.plugins.coach.viewsets.class_summary import NOT_STARTED
from kolibri.plugins.coach.viewsets.class_summary import STARTED
from kolibri.utils.time_utils import local_now

from . import helpers

DUMMY_PASSWORD = "password"


class ClassSummaryTestCase(EvaluationMixin, APITestCase):
    databases = "__all__"

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        super().setUpTestData()
        cls.classroom = Classroom.objects.create(name="classrom", parent=cls.facility)
        cls.another_classroom = Classroom.objects.create(
            name="another classrom", parent=cls.facility
        )

        cls.facility_admin = helpers.create_facility_admin(
            username="facility_admin", password=DUMMY_PASSWORD, facility=cls.facility
        )
        cls.facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            is_facility_coach=True,
        )
        cls.classroom_coach = helpers.create_coach(
            username="classroom_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            classroom=cls.classroom,
        )
        cls.another_classroom_coach = helpers.create_coach(
            username="another_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            classroom=cls.another_classroom,
        )
        cls.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=cls.facility
        )

        cls.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.facility_admin,
            # Add all created nodes from the evaluation mixin.
            resources=[
                {
                    "contentnode_id": node.id,
                    "content_id": node.content_id,
                    "channel_id": node.channel_id,
                }
                for node in cls.content_nodes
            ],
        )

        # Add all users to the classroom so their data will appear in the summary
        for user in cls.users:
            cls.classroom.add_member(user)

        cls.basename = "kolibri:kolibri.plugins.coach:classsummary"
        cls.detail_name = cls.basename + "-detail"

    def test_non_existent_nodes_do_show_up_in_lessons(self):
        node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).first()
        last_node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).last()
        real_data = {
            "contentnode_id": node.id,
            "content_id": node.content_id,
            "channel_id": node.channel_id,
        }
        switched_data = {
            "contentnode_id": uuid.uuid4().hex,
            "content_id": last_node.content_id,
            "channel_id": node.channel_id,
        }
        fake_data = {
            "contentnode_id": uuid.uuid4().hex,
            "content_id": uuid.uuid4().hex,
            "channel_id": node.channel_id,
        }
        self.lesson.resources = [real_data, switched_data, fake_data]
        self.lesson.save()

        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )
        lesson = response.data["lessons"][0]
        node_ids = lesson["node_ids"]
        self.assertIn(real_data["contentnode_id"], node_ids)
        # swapped data
        self.assertNotIn(last_node.id, node_ids)
        self.assertIn(fake_data["contentnode_id"], node_ids)
        self.assertTrue(lesson["missing_resource"])

    def test_anon_user_cannot_access_detail(self):
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_detail(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_another_classroom_coach_cannot_access_detail(self):
        self.client.login(
            username=self.another_classroom_coach.username,
            password=DUMMY_PASSWORD,
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_can_access_detail(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access_detail(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access_detail(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_practice_quiz_summary(self):
        # Delete in progress tries for this test.
        MasteryLog.objects.filter(complete=False).delete()
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )
        content_status = response.data["content_learner_status"]
        self.assertEqual(len(content_status), 2 * len(self.users))
        for user_index, user in enumerate(self.users):
            current_try = self.user_tries[user_index][0]
            try:
                previous_try = self.user_tries[user_index][1]
            except IndexError:
                previous_try = None
            content_id = current_try.summarylog.content_id
            data = next(
                d
                for d in content_status
                if d["learner_id"] == user.id and d["content_id"] == content_id
            )
            self.assertEqual(
                data["num_correct"],
                sum(current_try.attemptlogs.values_list("correct", flat=True)),
            )
            self.assertEqual(
                data["previous_num_correct"],
                sum(previous_try.attemptlogs.values_list("correct", flat=True))
                if previous_try
                else 0,
            )

    def _get_detail_response(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        return self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

    def test_picture_password_settings_is_null_when_not_configured(self):
        response = self._get_detail_response()
        self.assertIsNone(response.data["picture_password_settings"])

    def test_picture_password_settings_returned_when_configured(self):
        settings = {"icon_style": "colorful", "show_icon_text": True}
        dataset = self.facility.dataset
        # picture_password_settings requires learner_can_edit_password=False
        dataset.learner_can_edit_password = False
        dataset.picture_password_settings = settings
        dataset.save()
        try:
            response = self._get_detail_response()
            self.assertEqual(response.data["picture_password_settings"], settings)
        finally:
            # Reset settings to avoid affecting other tests, given that the facility
            # is desfined globally across tests.
            dataset.learner_can_edit_password = True
            dataset.picture_password_settings = None
            dataset.save()

    def test_learner_data_includes_picture_password(self):
        response = self._get_detail_response()
        learner_data = response.data["learners"]
        self.assertTrue(all("picture_password" in learner for learner in learner_data))

    def test_completed_exercise_with_help_notification_shows_completed(self):
        """Regression test for #14515: progress=1.0 should override help status."""
        learner = self.users[0]
        node = self.content_nodes[0]
        summarylog = self.summary_logs[0][0]
        summarylog.progress = 1.0
        summarylog.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=learner.id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson.id,
            contentnode_id=node.id,
            reason=HelpReason.Multiple,
            timestamp=local_now(),
        )

        lesson_data = [{"id": self.lesson.id, "node_ids": [node.id]}]
        learners_data = [{"id": learner.id}]
        result = content_status_serializer(lesson_data, learners_data, self.classroom)
        status = next(
            r["status"]
            for r in result
            if r["learner_id"] == learner.id and r["content_id"] == node.content_id
        )
        self.assertEqual(status, "Completed")

    def test_incomplete_exercise_with_help_notification_shows_help_needed(self):
        learner = self.users[0]
        node = self.content_nodes[0]
        summarylog = self.summary_logs[0][0]
        summarylog.progress = 0.3
        summarylog.save()

        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=learner.id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson.id,
            contentnode_id=node.id,
            reason=HelpReason.Multiple,
            timestamp=local_now(),
        )

        lesson_data = [{"id": self.lesson.id, "node_ids": [node.id]}]
        learners_data = [{"id": learner.id}]
        result = content_status_serializer(lesson_data, learners_data, self.classroom)
        status = next(
            r["status"]
            for r in result
            if r["learner_id"] == learner.id and r["content_id"] == node.content_id
        )
        self.assertEqual(status, "HelpNeeded")


class ClassSummaryDiffTestCase(EvaluationMixin, APITestCase):
    databases = "__all__"

    def test_practice_quiz_summary(self):
        provision_device()
        classroom = Classroom.objects.create(name="classrom", parent=self.facility)
        facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            is_facility_coach=True,
        )

        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=classroom,
            created_by=facility_coach,
            # Add all created nodes from the evaluation mixin.
            resources=[
                {
                    "contentnode_id": node.id,
                    "content_id": node.content_id,
                    "channel_id": node.channel_id,
                }
                for node in self.content_nodes
            ],
        )

        # Add all users to the classroom so their data will appear in the summary
        for user in self.users:
            classroom.add_member(user)

        # Delete in progress tries for this test.
        MasteryLog.objects.filter(complete=False).delete()
        self.client.login(username=facility_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.coach:classsummary-detail",
                kwargs={"pk": classroom.id},
            )
        )
        content_status = response.data["content_learner_status"]
        self.assertEqual(len(content_status), 2 * len(self.users))
        for user_index, user in enumerate(self.users):
            current_try = self.user_tries[user_index][0]
            try:
                previous_try = self.user_tries[user_index][1]
            except IndexError:
                previous_try = None
            content_id = current_try.summarylog.content_id
            data = next(
                d
                for d in content_status
                if d["learner_id"] == user.id and d["content_id"] == content_id
            )
            self.assertEqual(
                data["num_correct"],
                sum(current_try.attemptlogs.values_list("correct", flat=True)),
            )
            self.assertEqual(
                data["previous_num_correct"],
                sum(previous_try.attemptlogs.values_list("correct", flat=True))
                if previous_try
                else 0,
            )


class ClassSummaryStatusTests(APITestCase):
    """
    Tests that the class summary API endpoint returns correct status values
    in content_learner_status for each content/learner combination.

    Mirrors the status scenarios in UnitLessonProgressStatusTests to confirm
    the shared get_log_status logic works correctly via both endpoints.
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Summary Status Test Facility")
        cls.classroom = Classroom.objects.create(
            name="Summary Status Test Classroom", parent=cls.facility
        )
        cls.coach = helpers.create_coach(
            "summarystatuscoach", "password", cls.facility, classroom=cls.classroom
        )
        cls.learner = helpers.create_learner(
            "summarystatuslearner", "password", cls.facility, cls.classroom
        )

        channel_id = uuid.uuid4().hex
        cls.video_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Status Test Video",
            kind=content_kinds.VIDEO,
            available=True,
        )
        cls.exercise_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=channel_id,
            title="Status Test Exercise",
            kind=content_kinds.EXERCISE,
            available=True,
        )
        cls.lesson = models.Lesson.objects.create(
            title="Status Test Lesson",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.coach,
            resources=[
                {
                    "contentnode_id": cls.video_node.id,
                    "content_id": cls.video_node.content_id,
                    "channel_id": channel_id,
                },
                {
                    "contentnode_id": cls.exercise_node.id,
                    "content_id": cls.exercise_node.content_id,
                    "channel_id": channel_id,
                },
            ],
        )
        cls.url = reverse(
            "kolibri:kolibri.plugins.coach:classsummary-detail",
            kwargs={"pk": cls.classroom.id},
        )

    def setUp(self):
        self.client.login(username="summarystatuscoach", password="password")

    def _create_summary_log(self, user, content_node, progress=0.0):
        now = timezone.now()
        return ContentSummaryLog.objects.create(
            user=user,
            content_id=content_node.content_id,
            channel_id=content_node.channel_id,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            time_spent=300.0,
            progress=progress,
            kind=content_node.kind,
        )

    def _add_attempt(self, user, summary_log):
        now = timezone.now()
        session = ContentSessionLog.objects.create(
            user=user,
            content_id=summary_log.content_id,
            channel_id=summary_log.channel_id,
            start_timestamp=now - datetime.timedelta(hours=1),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
        )
        mastery = MasteryLog.objects.create(
            user=user,
            summarylog=summary_log,
            start_timestamp=now - datetime.timedelta(hours=1),
            mastery_level=1,
            complete=False,
        )
        AttemptLog.objects.create(
            masterylog=mastery,
            sessionlog=session,
            user=user,
            item=uuid.uuid4().hex,
            start_timestamp=now - datetime.timedelta(minutes=10),
            end_timestamp=now,
            correct=0,
        )

    def _get_status(self, response, learner_id, content_id):
        for entry in response.data["content_learner_status"]:
            if entry["learner_id"] == learner_id and entry["content_id"] == content_id:
                return entry["status"]
        return None

    def test_no_log_yields_no_status_entry(self):
        """Without a ContentSummaryLog, a learner has no entry in content_learner_status."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        learner_entries = [
            e
            for e in response.data["content_learner_status"]
            if e["learner_id"] == self.learner.id
        ]
        self.assertEqual(learner_entries, [])

    def test_video_started_status(self):
        """A video with 0 < progress < 1 is STARTED."""
        self._create_summary_log(self.learner, self.video_node, progress=0.5)
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.video_node.content_id),
            STARTED,
        )

    def test_video_completed_status(self):
        """A video with progress == 1 is COMPLETED."""
        self._create_summary_log(self.learner, self.video_node, progress=1.0)
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.video_node.content_id),
            COMPLETED,
        )

    def test_exercise_no_attempts_is_not_started(self):
        """An exercise with a log but no attempt logs is NOT_STARTED."""
        self._create_summary_log(self.learner, self.exercise_node, progress=0.0)
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.exercise_node.content_id),
            NOT_STARTED,
        )

    def test_exercise_with_attempts_is_started(self):
        """An exercise with attempt logs but progress < 1 is STARTED."""
        log = self._create_summary_log(self.learner, self.exercise_node, progress=0.3)
        self._add_attempt(self.learner, log)
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.exercise_node.content_id),
            STARTED,
        )

    def test_help_needed_status(self):
        """A HelpNeeded notification gives HELP_NEEDED status for an in-progress exercise."""
        log = self._create_summary_log(self.learner, self.exercise_node, progress=0.3)
        self._add_attempt(self.learner, log)
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=self.learner.id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson.id,
            contentnode_id=self.exercise_node.id,
            reason=HelpReason.Multiple,
            timestamp=local_now(),
        )
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.exercise_node.content_id),
            HELP_NEEDED,
        )

    def test_progress_complete_overrides_help_notification(self):
        """progress == 1 returns COMPLETED even when a HelpNeeded notification exists."""
        log = self._create_summary_log(self.learner, self.exercise_node, progress=1.0)
        self._add_attempt(self.learner, log)
        LearnerProgressNotification.objects.create(
            notification_object=NotificationObjectType.Resource,
            notification_event=NotificationEventType.Help,
            user_id=self.learner.id,
            classroom_id=self.classroom.id,
            lesson_id=self.lesson.id,
            contentnode_id=self.exercise_node.id,
            reason=HelpReason.Multiple,
            timestamp=local_now(),
        )
        response = self.client.get(self.url)
        self.assertEqual(
            self._get_status(response, self.learner.id, self.exercise_node.content_id),
            COMPLETED,
        )
