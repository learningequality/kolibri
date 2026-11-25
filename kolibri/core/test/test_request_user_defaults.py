import uuid

from django.urls import reverse
from le_utils.constants import modalities
from parameterized import parameterized
from rest_framework.test import APITestCase

from kolibri.core.attendance.models import AttendanceSession
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.models import PinnedDevice
from kolibri.core.exams.models import DraftExam
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment

CREATOR_CASES = (
    ("lesson", Lesson, "created_by"),
    ("coursesession", CourseSession, "created_by"),
    ("exam", Exam, "creator"),
    ("draft", DraftExam, "creator"),
    ("attendancesession", AttendanceSession, "created_by"),
)
ASSIGNMENT_CASES = (
    ("lesson", LessonAssignment, "lesson"),
    ("coursesession", CourseSessionAssignment, "course_session"),
    ("exam", ExamAssignment, "exam"),
)


class RequestUserDefaultsAPITestCase(APITestCase):
    """Ownership is server-controlled across the authoring APIs."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="Facility")
        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.other_coach = FacilityUser.objects.create(
            username="other_coach", facility=cls.facility
        )
        cls.classroom.add_coach(cls.coach)
        cls.classroom.add_coach(cls.other_coach)
        cls.group = LearnerGroup.objects.create(name="Group", parent=cls.classroom)
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.classroom.add_member(cls.learner)
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            title="Course",
            modality=modalities.COURSE,
            available=True,
        )

    def _payload(self, name):
        payload = {"collection": self.classroom.id}
        if name != "attendancesession":
            payload.update(title="Title", assignments=[])
        if name == "coursesession":
            payload["course"] = self.course.id
        if name in ("exam", "draft"):
            payload.update(
                draft=name == "draft",
                question_sources=[
                    {
                        "section_title": "Section",
                        "questions": [
                            {
                                "exercise_id": uuid.uuid4().hex,
                                "question_id": uuid.uuid4().hex,
                                "counter_in_exercise": 0,
                            }
                        ],
                    }
                ],
            )
        return payload

    def _url(self, name, pk=None):
        endpoint = "exam" if name == "draft" else name
        if pk is None:
            return reverse(f"kolibri:core:{endpoint}-list")
        return reverse(f"kolibri:core:{endpoint}-detail", kwargs={"pk": pk})

    def _create(self, name, **data):
        self.client.force_authenticate(self.coach)
        payload = self._payload(name)
        payload.update(data)
        response = self.client.post(self._url(name), payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response

    @parameterized.expand([(case[0],) for case in CREATOR_CASES])
    def test_anonymous_cannot_create(self, name):
        response = self.client.post(self._url(name), self._payload(name), format="json")
        self.assertEqual(response.status_code, 403, response.data)

    @parameterized.expand(CREATOR_CASES)
    def test_create_ignores_supplied_creator(self, name, model, field):
        response = self._create(name, **{field: self.other_coach.id})
        instance = model.objects.get(pk=response.data["id"])
        self.assertEqual(getattr(instance, field), self.coach)
        self.assertNotIn(field, response.data)
        detail = self.client.get(self._url(name, instance.pk))
        self.assertEqual(detail.status_code, 200)
        self.assertNotIn(field, detail.data)
        listing = self.client.get(self._url(name))
        self.assertEqual(listing.status_code, 200)
        self.assertTrue(listing.data)
        for item in listing.data:
            self.assertNotIn(field, item)

    @parameterized.expand(
        [(*case, method) for case in CREATOR_CASES for method in ("patch", "put")]
    )
    def test_second_coach_preserves_creator(self, name, model, field, method):
        response = self._create(name)
        instance = model.objects.get(pk=response.data["id"])
        self.client.force_authenticate(self.other_coach)
        payload = self._payload(name)
        payload.pop("question_sources", None)
        payload[field] = self.other_coach.id
        response = getattr(self.client, method)(
            self._url(name, instance.pk), payload, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        instance.refresh_from_db()
        self.assertEqual(getattr(instance, field), self.coach)
        self.assertNotIn(field, response.data)

    @parameterized.expand(ASSIGNMENT_CASES)
    def test_create_assignments_sets_requesting_user(self, name, model, parent):
        response = self._create(
            name,
            assignments=[self.group.id],
            learner_ids=[self.learner.id],
        )
        assignments = model.objects.filter(**{f"{parent}_id": response.data["id"]})
        self.assertEqual(assignments.count(), 2)
        for assignment in assignments:
            self.assertEqual(assignment.assigned_by, self.coach)
        self.assertNotIn("assigned_by", response.data)

    @parameterized.expand(
        [
            (*case, method, individual)
            for case in ASSIGNMENT_CASES
            for method in ("patch", "put")
            for individual in (False, True)
        ]
    )
    def test_second_coach_authors_new_assignments(
        self, name, model, parent, method, individual
    ):
        response = self._create(name, assignments=[self.classroom.id])
        pk = response.data["id"]
        self.client.force_authenticate(self.other_coach)
        payload = self._payload(name)
        payload.pop("question_sources", None)
        payload.update(assignments=[self.classroom.id])
        if individual:
            payload["learner_ids"] = [self.learner.id]
        else:
            payload["assignments"].append(self.group.id)
        response = getattr(self.client, method)(
            self._url(name, pk), payload, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        assignments = model.objects.filter(**{f"{parent}_id": pk})
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(
            assignments.get(collection=self.classroom).assigned_by, self.coach
        )
        self.assertEqual(
            assignments.exclude(collection=self.classroom).get().assigned_by,
            self.other_coach,
        )

    @parameterized.expand([("patch",), ("put",)])
    def test_second_coach_publishes_draft_preserving_creator(self, method):
        response = self._create(
            "draft", assignments=[self.group.id], learner_ids=[self.learner.id]
        )
        draft_id = response.data["id"]
        self.client.force_authenticate(self.other_coach)
        payload = self._payload("exam") if method == "put" else {"draft": False}
        payload.pop("question_sources", None)
        if method == "put":
            payload["assignments"] = [self.group.id]
        payload.update(creator=self.other_coach.id)
        response = getattr(self.client, method)(
            self._url("draft", draft_id), payload, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        exam = Exam.objects.get(pk=response.data["id"])
        self.assertEqual(exam.creator, self.coach)
        self.assertFalse(DraftExam.objects.filter(pk=draft_id).exists())
        self.assertEqual(exam.assignments.count(), 2)
        for assignment in exam.assignments.all():
            self.assertEqual(assignment.assigned_by, self.other_coach)
        self.assertNotIn("creator", response.data)

    def test_pinned_device_ignores_supplied_user(self):
        self.client.force_authenticate(self.coach)
        device = NetworkLocation.objects.create(base_url="http://device.test/")
        response = self.client.post(
            reverse("kolibri:core:pinned_devices-list"),
            {"instance_id": device.id, "user": self.other_coach.id},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        pin = PinnedDevice.objects.get(pk=response.data["id"])
        self.assertEqual(pin.user, self.coach)
        self.assertNotIn("user", response.data)
        response = self.client.put(
            reverse("kolibri:core:pinned_devices-detail", kwargs={"pk": pin.pk}),
            {"instance_id": device.id, "user": self.other_coach.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        pin.refresh_from_db()
        self.assertEqual(pin.user, self.coach)
        self.assertNotIn("user", response.data)
