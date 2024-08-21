import uuid

from django.urls import reverse
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
from kolibri.core.exams.constants import MAX_QUESTIONS_PER_QUIZ_SECTION
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog

DUMMY_PASSWORD = "password"


class BaseExamTest:
    databases = "__all__"

    @property
    def draft(self):
        if self.class_object == models.DraftExam:
            return True
        return False

    def assertExamExists(self, **params):
        self.assertTrue(self.class_object.objects.filter(**params).exists())

    def assertExamNotExist(self, **params):
        self.assertFalse(self.class_object.objects.filter(**params).exists())

    def assertAssignmentCollections(self, exam_id, *collections):
        assignments = models.Exam.objects.get(id=exam_id).assignments.all()
        self.assertEqual(assignments.count(), len(collections))
        for assignment, collection in zip(
            sorted(assignments, key=lambda x: x.collection.id),
            sorted(collections, key=lambda x: x.id),
        ):
            self.assertEqual(assignment.collection, collection)

    def assertLearnerAssignments(self, exam_id, *learners):
        adhoc_group = AdHocGroup.objects.get(parent=self.classroom)
        self.assertEqual(len(adhoc_group.get_members()), len(learners))
        for member, learner in zip(
            sorted(adhoc_group.get_members(), key=lambda x: x.id),
            sorted(learners, key=lambda x: x.id),
        ):
            self.assertEqual(member, learner)
        self.assertEqual(
            models.ExamAssignment.objects.get(collection=adhoc_group).exam,
            models.Exam.objects.get(id=exam_id),
        )

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="MyFac")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)
        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        kwargs = dict(
            title="title",
            collection=cls.classroom,
            creator=cls.admin,
            question_sources=[
                {
                    "section_title": "Test Section Title",
                    "description": "Test descripton for Section",
                    "questions": [
                        {
                            "exercise_id": uuid.uuid4().hex,
                            "question_id": uuid.uuid4().hex,
                            "title": "Test question Title",
                            "counter_in_exercise": 0,
                        }
                    ],
                    "learners_see_fixed_order": False,
                }
            ],
        )
        if cls.class_object == models.Exam:
            kwargs["active"] = True
        cls.exam = cls.class_object.objects.create(**kwargs)

    def make_basic_exam(self):
        sections = self.make_basic_sections(1)
        return {
            "title": "Exam",
            "draft": self.draft,
            "collection": self.classroom.id,
            "learners_see_fixed_order": False,
            "question_sources": sections,
            "assignments": [],
        }

    def make_basic_sections(self, no_of_sec):
        sections = []
        questions = self.make_basic_questions(3)
        for i in range(1, no_of_sec + 1):
            section = {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": questions,
                "learners_see_fixed_order": False,
            }
            sections.append(section)
        return sections

    def make_basic_questions(self, no_of_ques):
        questions = []

        for i in range(1, no_of_ques + 1):
            question = {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": f"Test question Title {i}",
                "counter_in_exercise": 0,
            }
            questions.append(question)

        return questions

    def post_new_exam(self, exam):
        return self.client.post(reverse("kolibri:core:exam-list"), exam, format="json")

    def patch_updated_exam(self, exam_id, update):
        return self.client.patch(
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
        exam_id = response.data["id"]
        self.assertExamExists(id=exam_id, date_created__isnull=False)

    def test_logged_in_admin_exam_create_with_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        self.assertAssignmentCollections(exam_id, self.facility)

    def test_logged_in_admin_exam_create_with_learner_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        exam["learner_ids"] = [user.id]
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        self.assertLearnerAssignments(exam_id, user)

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
        patch_response = self.patch_updated_exam(
            exam_id, {"assignments": exam["assignments"]}
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertAssignmentCollections(exam_id)

    def test_logged_in_admin_exam_update_different_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        post_response = self.post_new_exam(exam)
        exam_id = post_response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        exam["assignments"] = [group.id]
        patch_response = self.patch_updated_exam(
            exam_id, {"assignments": exam["assignments"]}
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertAssignmentCollections(exam_id, group)

    def test_logged_in_admin_exam_update_additional_assignments(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["assignments"] = [self.facility.id]
        post_response = self.post_new_exam(exam)
        exam_id = post_response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        exam["assignments"].append(group.id)
        patch_response = self.patch_updated_exam(
            exam_id, {"assignments": exam["assignments"]}
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertAssignmentCollections(exam_id, group, self.facility)

    def test_logged_in_user_exam_no_create(self):
        self.login_as_learner()
        response = self.post_new_exam(self.make_basic_exam())
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_update(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"title": "updated title"})
        self.assertEqual(response.status_code, 200)
        self.assertExamExists(id=self.exam.id, title="updated title")

    def test_logged_in_user_exam_no_update(self):
        self.login_as_learner()
        response = self.patch_updated_exam(self.exam.id, {"title": "updated title"})
        self.assertEqual(response.status_code, 403)
        self.assertExamExists(id=self.exam.id, title="title")

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
        exam["question_sources"][0]["questions"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                # missing 'counter_in_exercise'
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)
        self.assertExamNotExist(title=title)

    def test_exam_with_invalid_exercise_id(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"][0]["questions"].append(
            {
                "exercise_id": "e1",
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_with_no_exercise_id(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"][0]["questions"].append(
            {
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
        exam["question_sources"][0]["questions"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": "q1",
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_with_no_question_id_fails(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"][0]["questions"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_with_valid_question_sources_succeeds(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["question_sources"][0]["questions"].append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 1,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)

    def test_can_get_quiz_size(self):
        self.login_as_admin()
        response = self.client.get(
            reverse("kolibri:core:exam-size"),
            {
                "class_id": self.classroom.id,
            },
        )
        self.assertEqual(response.status_code, 200)

    def test_quiz_section_with_no_question_succeds(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        title = "invalid_question_sources"
        exam["title"] = title
        exam["question_sources"].append(
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "learners_see_fixed_order": False,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)
        self.assertExamExists(title=title)

    def test_get_on_older_versions_of_exam_model(self):
        self.login_as_admin()
        self.exam.question_sources.append(
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 0,
            }
        )

        self.exam.save()

        response = self.client.get(
            reverse("kolibri:core:exam-detail", kwargs={"pk": self.exam.id}),
        )

        self.assertEqual(response.status_code, 200)

    def test_retrieve_exam(self):
        self.login_as_admin()
        response = self.client.get(
            reverse("kolibri:core:exam-detail", kwargs={"pk": self.exam.id}),
        )

        self.assertEqual(response.status_code, 200)
        for field in [
            "id",
            "title",
            "draft",
            "active",
            "archive",
            "question_sources",
            "seed",
            "collection",
            "question_count",
            "creator",
            "data_model_version",
            "learners_see_fixed_order",
            "date_created",
        ]:
            self.assertIn(field, response.data)

    def test_post_exam_v2_model_fails(self):
        self.login_as_admin()
        basic_exam = {
            "title": "Exam",
            "question_count": 1,
            "active": True,
            "collection": self.classroom.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [],
            "date_activated": None,
            "date_archived": None,
            "creator": self.admin.id,
        }
        basic_exam["question_sources"] = [
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 0,
            }
        ]

        response = self.post_new_exam(basic_exam)
        self.assertEqual(response.status_code, 400)

    def test_exam_model_get_questions_v3(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        exam_model_instance = self.class_object.objects.get(id=exam_id)
        self.assertEqual(len(exam_model_instance.get_questions()), 3)

    def test_exam_model_get_questions_v2_v1(self):
        self.login_as_admin()
        self.exam.data_model_version = 2
        self.exam.question_sources = [
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Title",
                "counter_in_exercise": 0,
            }
        ]

        self.exam.save()
        self.assertEqual(len(self.exam.get_questions()), 1)

    def test_exam_question_count_calculation(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        question_count = sum(
            len(source["questions"]) for source in exam["question_sources"]
        )
        response = self.post_new_exam(exam)
        exam_id = response.data["id"]
        self.assertEqual(response.status_code, 201)
        exam_model_instance = self.class_object.objects.get(id=exam_id)
        self.assertEqual(exam_model_instance.question_count, question_count)

    def test_exam_question_max_length(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        questions = self.make_basic_questions(MAX_QUESTIONS_PER_QUIZ_SECTION + 1)
        exam["question_sources"][0]["questions"] = questions
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_admin_can_update_learner_sees_fixed_order(self):
        self.login_as_admin()
        response = self.patch_updated_exam(
            self.exam.id, {"learners_see_fixed_order": True}
        )
        self.assertEqual(response.status_code, 200)
        self.assertExamExists(id=self.exam.id, learners_see_fixed_order=True)


class ExamAPITestCase(BaseExamTest, APITestCase):
    class_object = models.Exam

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
        self.assertEqual(MASTERY_LOGS, len(open_mastery_logs))

        # Finally - make the request.
        self.patch_updated_exam(self.exam.id, {"archive": True})
        mastery_logs = MasteryLog.objects.filter(summarylog__content_id=self.exam.id)
        closed_mastery_logs = MasteryLog.objects.filter(
            summarylog__content_id=self.exam.id, complete=True
        )
        # No new MasteryLogs made - but all that were made previously are complete.
        self.assertEqual(len(closed_mastery_logs), len(mastery_logs))
        self.assertEqual(MASTERY_LOGS, len(closed_mastery_logs))

    def test_logged_in_admin_exam_update_active(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"active": True})
        self.assertEqual(response.status_code, 200)
        self.assertExamExists(id=self.exam.id, active=True)

    def test_logged_in_admin_exam_update_archive(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"archive": True})
        self.assertEqual(response.status_code, 200)
        self.assertExamExists(id=self.exam.id, archive=True)

    def test_logged_in_admin_exam_update_cannot_undraft(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"draft": True})
        self.assertEqual(response.status_code, 400)
        # Check that the exam is still not a draft
        self.assertExamExists(id=self.exam.id)

    def test_logged_in_admin_exam_update_cannot_update_question_sources(self):
        self.login_as_admin()
        previous_sections = self.exam.question_sources
        sections = self.make_basic_sections(2)
        response = self.patch_updated_exam(self.exam.id, {"question_sources": sections})
        self.assertEqual(response.status_code, 400)
        self.exam.refresh_from_db()
        self.assertEqual(self.exam.question_sources, previous_sections)

    def test_logged_in_admin_exam_can_create_and_publish_remove_empty_sections(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["draft"] = False
        exam["question_sources"].append(
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": [],
                "learners_see_fixed_order": False,
            }
        )
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)
        exam_id = response.data["id"]
        exam = models.Exam.objects.get(id=exam_id)
        self.assertEqual(len(exam.question_sources), 1)

    def test_logged_in_admin_exam_cant_create_and_publish_empty_quiz(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["draft"] = False
        exam["question_sources"] = []
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_logged_in_admin_exam_cant_create_and_publish_empty_sections(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["draft"] = False
        exam["question_sources"] = [
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": [],
                "learners_see_fixed_order": False,
            },
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": [],
                "learners_see_fixed_order": False,
            },
        ]
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)


class ExamDraftAPITestCase(BaseExamTest, APITestCase):
    class_object = models.DraftExam

    def assertAssignmentCollections(self, exam_id, *collections):
        assignments = models.DraftExam.objects.get(id=exam_id).assignments
        self.assertEqual(len(assignments), len(collections))
        for assignment, collection in zip(
            sorted(assignments), sorted(collections, key=lambda x: x.id)
        ):
            self.assertEqual(assignment, collection.id)

    def assertLearnerAssignments(self, exam_id, *learners):
        learner_ids = models.DraftExam.objects.get(id=exam_id).learner_ids
        self.assertEqual(len(learner_ids), len(learners))
        for learner_id, learner in zip(
            sorted(learner_ids), sorted(learners, key=lambda x: x.id)
        ):
            self.assertEqual(learner_id, learner.id)

    def test_logged_in_admin_exam_update_can_publish(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"draft": False})
        self.assertEqual(response.status_code, 200)
        # Check that the draft exam no longer exists
        self.assertExamNotExist(id=self.exam.id)
        # Check that the exam exists
        self.assertTrue(models.Exam.objects.filter(title=self.exam.title).exists())

    def test_logged_in_admin_exam_update_can_publish_assignments(self):
        self.login_as_admin()
        response = self.patch_updated_exam(
            self.exam.id, {"draft": False, "assignments": [self.classroom.id]}
        )
        self.assertEqual(response.status_code, 200)
        # Check that the draft exam no longer exists
        self.assertExamNotExist(id=self.exam.id)
        # Check that the exam exists
        try:
            exam = models.Exam.objects.get(title=self.exam.title)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")
        super().assertAssignmentCollections(exam.id, self.classroom)

    def test_logged_in_admin_exam_update_can_publish_existing_assignments(self):
        self.login_as_admin()
        self.exam.assignments = [self.classroom.id]
        self.exam.save()
        response = self.patch_updated_exam(self.exam.id, {"draft": False})
        self.assertEqual(response.status_code, 200)
        # Check that the draft exam no longer exists
        self.assertExamNotExist(id=self.exam.id)
        # Check that the exam exists
        try:
            exam = models.Exam.objects.get(title=self.exam.title)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")
        super().assertAssignmentCollections(exam.id, self.classroom)

    def test_logged_in_admin_exam_update_can_publish_learner_ids(self):
        self.login_as_admin()
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        response = self.patch_updated_exam(
            self.exam.id, {"draft": False, "learner_ids": [user.id]}
        )
        self.assertEqual(response.status_code, 200)
        # Check that the draft exam no longer exists
        self.assertExamNotExist(id=self.exam.id)
        # Check that the exam exists
        try:
            exam = models.Exam.objects.get(title=self.exam.title)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")
        super().assertLearnerAssignments(exam.id, user)

    def test_logged_in_admin_exam_update_can_publish_existing_learner_ids(self):
        self.login_as_admin()
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        self.exam.learner_ids = [user.id]
        self.exam.save()
        response = self.patch_updated_exam(self.exam.id, {"draft": False})
        self.assertEqual(response.status_code, 200)
        # Check that the draft exam no longer exists
        self.assertExamNotExist(id=self.exam.id)
        # Check that the exam exists
        try:
            exam = models.Exam.objects.get(title=self.exam.title)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")
        super().assertLearnerAssignments(exam.id, user)

    def test_logged_in_admin_exam_cant_update_active(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"active": True})
        self.assertEqual(response.status_code, 400)

    def test_logged_in_admin_exam_cant_update_archive(self):
        self.login_as_admin()
        response = self.patch_updated_exam(self.exam.id, {"archive": True})
        self.assertEqual(response.status_code, 400)

    def test_logged_in_admin_exam_can_update_active_if_publishing(self):
        self.login_as_admin()
        response = self.patch_updated_exam(
            self.exam.id, {"draft": False, "active": True}
        )
        self.assertEqual(response.status_code, 200)
        try:
            models.Exam.objects.get(title=self.exam.title, active=True)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")

    def test_logged_in_admin_exam_can_update_archive_if_publishing(self):
        self.login_as_admin()
        response = self.patch_updated_exam(
            self.exam.id, {"draft": False, "archive": True}
        )
        self.assertEqual(response.status_code, 200)
        try:
            models.Exam.objects.get(title=self.exam.title, archive=True)
        except models.Exam.DoesNotExist:
            self.fail("Exam not created")

    def test_logged_in_admin_exam_cant_create_active(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["active"] = True
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_logged_in_admin_exam_can_create_active_false(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["active"] = False
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_exam_cant_create_archive(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["archive"] = True
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 400)

    def test_logged_in_admin_exam_can_create_archive_false(self):
        self.login_as_admin()
        exam = self.make_basic_exam()
        exam["archive"] = False
        response = self.post_new_exam(exam)
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_exam_can_update_and_publish_remove_empty_sections(self):
        self.login_as_admin()
        self.exam.question_sources = self.make_basic_sections(1) + [
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": [],
                "learners_see_fixed_order": False,
            }
        ]
        self.exam.save()
        response = self.patch_updated_exam(self.exam.id, {"draft": False})
        self.assertEqual(response.status_code, 200)
        exam_id = response.data["id"]
        exam = models.Exam.objects.get(id=exam_id)
        self.assertEqual(len(exam.question_sources), 1)

    def test_logged_in_admin_exam_cant_update_and_publish_empty_quiz(self):
        self.login_as_admin()
        self.exam.question_sources = [
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": [],
                "learners_see_fixed_order": False,
            }
        ]
        self.exam.save()
        response = self.patch_updated_exam(self.exam.id, {"draft": False})
        self.assertEqual(response.status_code, 400)
