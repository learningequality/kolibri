from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from datetime import timedelta
from uuid import uuid4

from django.test import TestCase
from django.utils.timezone import now

from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.exams.models import Exam
from kolibri.core.logger import models
from kolibri.core.logger.utils.exam_log_migration import migrate_from_exam_logs


class SimpleForwardMigrateTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        coach = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="quiz", question_count=5, collection=cls.facility, creator=coach
        )
        for i in range(0, 3):
            user = FacilityUserFactory.create(facility=cls.facility)

            examlog = models.ExamLog.objects.create(user=user, exam=cls.exam)
            for j in range(0, 4):
                models.ExamAttemptLog.objects.create(
                    item=str(j),
                    user=user,
                    examlog=examlog,
                    start_timestamp=now(),
                    end_timestamp=now(),
                    correct=j % 2,
                    content_id=uuid4().hex,
                    answer={"question": {"radio 1": {"numCorrect": 1}}},
                    interaction_history=[{"history_a": 1}, {"history_b": 1}],
                )

        migrate_from_exam_logs(models.ExamLog.objects.all())

    def test_masterylogs(self):
        self.assertEqual(models.MasteryLog.objects.all().count(), 3)
        self.assertEqual(models.MasteryLog.objects.filter(complete=False).count(), 3)
        for log in models.MasteryLog.objects.all():
            self.assertTrue(log.mastery_criterion["coach_assigned"])

    def test_attemptlogs(self):
        self.assertEqual(models.AttemptLog.objects.all().count(), 12)
        attempt_log = models.AttemptLog.objects.first()
        self.assertEqual(len(attempt_log.item.split(":")), 2)
        for json_field in ("answer", "interaction_history"):
            self.assertNotIsInstance(getattr(attempt_log, json_field), (str,))

    def test_contentsessionlogs(self):
        self.assertEqual(
            models.ContentSessionLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSessionLog.objects.filter(progress=0).count(),
            3,
        )

    def test_contentsummarylogs(self):
        self.assertEqual(
            models.ContentSummaryLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSummaryLog.objects.filter(progress=0).count(),
            3,
        )


class RepeatedForwardMigrateTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        coach = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="quiz", question_count=5, collection=cls.facility, creator=coach
        )
        for i in range(0, 3):
            user = FacilityUserFactory.create(facility=cls.facility)

            examlog = models.ExamLog.objects.create(user=user, exam=cls.exam)
            for j in range(0, 4):
                models.ExamAttemptLog.objects.create(
                    item=str(j),
                    user=user,
                    examlog=examlog,
                    start_timestamp=now(),
                    end_timestamp=now(),
                    correct=j % 2,
                    content_id=uuid4().hex,
                )

        migrate_from_exam_logs(models.ExamLog.objects.all())
        migrate_from_exam_logs(models.ExamLog.objects.all())

    def test_masterylogs(self):
        self.assertEqual(models.MasteryLog.objects.all().count(), 3)
        self.assertEqual(models.MasteryLog.objects.filter(complete=False).count(), 3)

    def test_attemptlogs(self):
        self.assertEqual(models.AttemptLog.objects.all().count(), 12)

    def test_contentsessionlogs(self):
        self.assertEqual(
            models.ContentSessionLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSessionLog.objects.filter(progress=0).count(),
            3,
        )

    def test_contentsummarylogs(self):
        self.assertEqual(
            models.ContentSummaryLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSummaryLog.objects.filter(progress=0).count(),
            3,
        )


class UpdatedForwardMigrateTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        coach = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="quiz", question_count=5, collection=cls.facility, creator=coach
        )
        for i in range(0, 3):
            user = FacilityUserFactory.create(facility=cls.facility)

            examlog = models.ExamLog.objects.create(user=user, exam=cls.exam)
            for j in range(0, 4):
                models.ExamAttemptLog.objects.create(
                    item=str(j),
                    user=user,
                    examlog=examlog,
                    start_timestamp=now(),
                    end_timestamp=now(),
                    correct=j % 2,
                    content_id=uuid4().hex,
                )

        migrate_from_exam_logs(models.ExamLog.objects.all())
        models.ExamLog.objects.all().update(closed=True)
        for examlog in models.ExamLog.objects.all():
            oldattempt = examlog.attemptlogs.first()
            oldattempt.end_timestamp = now() + timedelta(hours=1)
            oldattempt.answer = {"something": "something"}
            oldattempt.simple_answer = "test_filter"
            oldattempt.correct = True
            oldattempt.save()
            olderattempt = examlog.attemptlogs.last()
            olderattempt.end_timestamp = now() - timedelta(hours=1)
            olderattempt.answer = {"nothing": "nothing"}
            olderattempt.simple_answer = "test_none_filter"
            olderattempt.correct = 0
            olderattempt.save()
            models.ExamAttemptLog.objects.create(
                item=str(j),
                user=examlog.user,
                examlog=examlog,
                start_timestamp=now(),
                end_timestamp=now(),
                correct=0,
                content_id=uuid4().hex,
            )
        migrate_from_exam_logs(models.ExamLog.objects.all())

    def test_masterylogs(self):
        self.assertEqual(models.MasteryLog.objects.all().count(), 3)
        self.assertEqual(models.MasteryLog.objects.filter(complete=True).count(), 3)

    def test_attemptlogs(self):
        self.assertEqual(models.AttemptLog.objects.all().count(), 15)
        modified_attempts = models.AttemptLog.objects.filter(
            simple_answer="test_filter"
        )
        self.assertEqual(modified_attempts.count(), 3)
        for attempt in modified_attempts:
            self.assertEqual(attempt.answer, {"something": "something"})
            self.assertEqual(attempt.correct, True)
        unmodified_attempts = models.AttemptLog.objects.filter(
            simple_answer="test_none_filter"
        )
        self.assertEqual(unmodified_attempts.count(), 0)

    def test_contentsessionlogs(self):
        self.assertEqual(
            models.ContentSessionLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSessionLog.objects.filter(progress=1).count(),
            3,
        )

    def test_contentsummarylogs(self):
        self.assertEqual(
            models.ContentSummaryLog.objects.all().count(),
            3,
        )
        self.assertEqual(
            models.ContentSummaryLog.objects.filter(progress=1).count(),
            3,
        )


class UpdatedExamAttemptLogOnlyForwardMigrateTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        coach = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="quiz", question_count=5, collection=cls.facility, creator=coach
        )
        for i in range(0, 3):
            user = FacilityUserFactory.create(facility=cls.facility)

            examlog = models.ExamLog.objects.create(user=user, exam=cls.exam)
            for j in range(0, 4):
                models.ExamAttemptLog.objects.create(
                    item=str(j),
                    user=user,
                    examlog=examlog,
                    start_timestamp=now(),
                    end_timestamp=now(),
                    correct=j % 2,
                    content_id=uuid4().hex,
                )

        migrate_from_exam_logs(models.ExamLog.objects.all())
        updated_ids = []
        for examlog in models.ExamLog.objects.all():
            oldattempt = examlog.attemptlogs.first()
            oldattempt.end_timestamp = now() + timedelta(hours=1)
            oldattempt.answer = {"something": "something"}
            oldattempt.simple_answer = "test_filter"
            oldattempt.correct = True
            oldattempt.save()
            updated_ids.append(oldattempt.id)
            olderattempt = examlog.attemptlogs.last()
            olderattempt.end_timestamp = now() - timedelta(hours=1)
            olderattempt.answer = {"nothing": "nothing"}
            olderattempt.simple_answer = "test_none_filter"
            olderattempt.correct = 0
            olderattempt.save()
            updated_ids.append(olderattempt.id)
            newattempt = models.ExamAttemptLog.objects.create(
                item=str(j),
                user=examlog.user,
                examlog=examlog,
                start_timestamp=now(),
                end_timestamp=now(),
                correct=0,
                content_id=uuid4().hex,
            )
            updated_ids.append(newattempt.id)
        migrate_from_exam_logs(
            models.ExamLog.objects.none(), source_attempt_log_ids=updated_ids
        )

    def test_masterylogs(self):
        self.assertEqual(models.MasteryLog.objects.all().count(), 3)

    def test_attemptlogs(self):
        self.assertEqual(models.AttemptLog.objects.all().count(), 15)
        modified_attempts = models.AttemptLog.objects.filter(
            simple_answer="test_filter"
        )
        self.assertEqual(modified_attempts.count(), 3)
        for attempt in modified_attempts:
            self.assertEqual(attempt.answer, {"something": "something"})
            self.assertEqual(attempt.correct, True)
        unmodified_attempts = models.AttemptLog.objects.filter(
            simple_answer="test_none_filter"
        )
        self.assertEqual(unmodified_attempts.count(), 0)

    def test_contentsessionlogs(self):
        self.assertEqual(
            models.ContentSessionLog.objects.all().count(),
            3,
        )

    def test_contentsummarylogs(self):
        self.assertEqual(
            models.ContentSummaryLog.objects.all().count(),
            3,
        )
