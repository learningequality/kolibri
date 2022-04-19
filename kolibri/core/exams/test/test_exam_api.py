from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

from django.core.urlresolvers import reverse
from django.utils.timezone import now
from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from kolibri.core import error_constants
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog


DUMMY_PASSWORD = "password"


class ExamAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="MyFac")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)
        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.exam = models.Exam.objects.create(
            title="title",
            question_count=1,
            active=True,
            collection=cls.classroom,
            creator=cls.admin,
        )

    def make_basic_exam(self):
        return {
            "title": "Exam",
            "question_count": 1,
            "active": True,
            "collection": self.classroom.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [],
            "date_activated": None,
            "date_archived": None,
        }

    def post_new_exam(self, exam):
        return self.client.post(reverse("kolibri:core:exam-list"), exam, format="json")

    def put_updated_exam(self, exam_id, update):
        return self.client.put(
            reverse("kolibri:core:exam-detail", kwargs={"pk": exam_id}),
            update,
            format="json",
        )

    def login_as_admin(self):
        return self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

    def login_as_learner(self):
        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()
        return self.client.login(username="learner", password="pass")

    def test_logged_in_user_exam_no_delete(self):
        self.login_as_learner()
        response = self.client.delete(
            reverse("kolibri:core:exam-detail", kwargs={"pk": self.exam.id})
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_delete(self):
        self.login_as_admin()
        response = self.client.delete(
            reverse("kolibri:core:exam-detail", kwargs={"pk": self.exam.id})
        )
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_exam_create(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_exam_create_with_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            models.ExamAssignment.objects.get(collection=self.facility).exam,
            models.Exam.objects.get(id=exam_id),
        )

    def test_logged_in_admin_exam_create_with_learner_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        exam["learner_ids"] = [user.id]
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        adhoc_group = AdHocGroup.objects.get(parent=self.classroom)
        self.assertEqual(len(adhoc_group.get_members()), 1)
        self.assertEqual(adhoc_group.get_members()[0], user)
        self.assertEqual(
            models.ExamAssignment.objects.get(collection=adhoc_group).exam,
            models.Exam.objects.get(id=exam_id),
        )

    def test_logged_in_admin_exam_create_with_learner_assignments_for_wrong_collection(
        self,
    ):
        self.login_as_admin()
        exam = self.make_basic_exam()
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        exam["learner_ids"] = [user.id]
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)
        with self.assertRaises(AdHocGroup.DoesNotExist):
            AdHocGroup.objects.get(parent=self.classroom)

    def test_logged_in_admin_exam_update_no_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        post_response = self.post_new_exam(exam)
        exam_id = post_response.data["id"]
        exam["assignments"] = []
        put_response = self.put_updated_exam(exam_id, exam)
        self.assertEqual(put_response.status_code, 200)
        self.assertEqual(models.Exam.objects.get(id=exam_id).assignments.count(), 0)

    def test_logged_in_admin_exam_update_different_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        post_response = self.post_new_exam(exam)
        exam_id = post_response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        exam["assignments"] = [group.id]
        put_response = self.put_updated_exam(exam_id, exam)
        self.assertEqual(put_response.status_code, 200)
        assignments = models.Exam.objects.get(id=exam_id).assignments
        self.assertEqual(assignments.count(), 1)
        self.assertEqual(assignments.first().collection, group)

    def test_logged_in_admin_exam_update_additional_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        post_response = self.post_new_exam(exam)
        exam_id = post_response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        exam["assignments"].append(group.id)
        put_response = self.put_updated_exam(exam_id, exam)
        self.assertEqual(put_response.status_code, 200)
        assignments = models.Exam.objects.get(id=exam_id).assignments
        self.assertEqual(assignments.count(), 2)
        self.assertIn(assignments.first().collection, [group, self.facility])
        self.assertIn(assignments.last().collection, [group, self.facility])

    def test_logged_in_user_exam_no_create(self):
        self.login_as_learner()
        response = self.post_new_exam(self.make_basic_exam())
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_update(self):
        self.login_as_admin()
        response = self.put_updated_exam(
            self.exam.id, {"title": "updated title", "active": True}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Exam.objects.get(id=self.exam.id).title, "updated title"
        )

    def test_complete_mastery_logs_when_exam_is_closed(self):
        self.login_as_admin()
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)

        MASTERY_LOGS = 0
        for i in range(10):
            user = FacilityUser.objects.create(
                username="u{}".format(i), facility=self.facility
            )

            self.classroom.add_member(user)

            # Add the user to the learner group
            group.add_learner(user)

            # Half of the students will _start_ the exam, half won't. So we will have
            # 5 MasteryLogs for this exam.
            if i <= 5:
                summarylog = ContentSummaryLog.objects.create(
                    user=user,
                    start_timestamp=now(),
                    end_timestamp=now(),
                    completion_timestamp=now(),
                    content_id=self.exam.id,
                    kind=content_kinds.QUIZ,
                )
                MasteryLog.objects.create(
                    mastery_criterion={"type": "quiz", "coach_assigned": True},
                    summarylog=summarylog,
                    start_timestamp=summarylog.start_timestamp,
                    user=user,
                    mastery_level=-1,
                )
                MASTERY_LOGS = MASTERY_LOGS + 1

        open_mastery_logs = MasteryLog.objects.filter(
            summarylog__content_id=self.exam.id, complete=False
        )
        # Make sure that the open exams in the DB match that which we counted above.
        self.assertEquals(MASTERY_LOGS, len(open_mastery_logs))

        # Finally - make the request.
        self.put_updated_exam(self.exam.id, {"archive": True})
        mastery_logs = MasteryLog.objects.filter(summarylog__content_id=self.exam.id)
        closed_mastery_logs = MasteryLog.objects.filter(
            summarylog__content_id=self.exam.id, complete=True
        )
        # No new MasteryLogs made - but all that were made previously are complete.
        self.assertEquals(len(closed_mastery_logs), len(mastery_logs))
        self.assertEquals(MASTERY_LOGS, len(closed_mastery_logs))

    def test_logged_in_user_exam_no_update(self):
        self.login_as_learner()
        response = self.put_updated_exam(
            self.exam.id, {"title": "updated title", "active": True}
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(models.Exam.objects.get(id=self.exam.id).title, "title")

    def test_cannot_create_exam_same_title_case_insensitive(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        self.post_new_exam(exam)
        exam["title"] = "EXAM"
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_exam_with_no_counter_in_exercise_fails(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        title = "invalid_question_sources"
        exam["title"] = title
        exam["question_sources"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                # missing 'counter_in_exercise'
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(models.Exam.objects.filter(title=title).exists())

    def test_exam_with_invalid_exercise_id(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"].append(
            {
                "exercise_id": "e1",
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_with_invalid_question_id(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": "q1",
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_with_no_question_id_succeeds(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)

    def test_exam_with_valid_question_sources_succeeds(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)
