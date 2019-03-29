"""
Permissions tests on the logging models.
"""
import uuid

from django.test import TestCase

from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import UserSessionLogFactory
from kolibri.core.auth.test.helpers import create_dummy_facility_data


class ContentSessionLogPermissionsTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.data["interaction_log"] = ContentSessionLogFactory.create(
            user=self.data["learners_one_group"][0][0],
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )

    def test_facilityadmin_sessionlog_permissions(self):
        self.assertTrue(
            self.data["facility_admin"].can_create_instance(
                self.data["interaction_log"]
            )
        )
        self.assertTrue(
            self.data["facility_admin"].can_read(self.data["interaction_log"])
        )
        self.assertTrue(
            self.data["facility_admin"].can_update(self.data["interaction_log"])
        )
        self.assertTrue(
            self.data["facility_admin"].can_delete(self.data["interaction_log"])
        )

    def test_coach_sessionlog_permissions(self):
        self.assertFalse(
            self.data["facility_coach"].can_create_instance(
                self.data["interaction_log"]
            )
        )
        self.assertTrue(
            self.data["facility_coach"].can_read(self.data["interaction_log"])
        )
        self.assertFalse(
            self.data["facility_coach"].can_update(self.data["interaction_log"])
        )
        self.assertFalse(
            self.data["facility_coach"].can_delete(self.data["interaction_log"])
        )

    def test_learner_sessionlog_permissions(self):
        learner = self.data["learners_one_group"][0][0]
        self.assertTrue(learner.can_create_instance(self.data["interaction_log"]))
        self.assertTrue(learner.can_read(self.data["interaction_log"]))
        self.assertTrue(learner.can_update(self.data["interaction_log"]))
        self.assertTrue(learner.can_delete(self.data["interaction_log"]))


class ContentSummaryLogPermissionsTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.data["summary_log"] = ContentSummaryLogFactory.create(
            user=self.data["learners_one_group"][0][1],
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
        )

    def test_facilityadmin_summarylog_permissions(self):
        self.assertTrue(
            self.data["facility_admin"].can_create_instance(self.data["summary_log"])
        )
        self.assertTrue(self.data["facility_admin"].can_read(self.data["summary_log"]))
        self.assertTrue(
            self.data["facility_admin"].can_update(self.data["summary_log"])
        )
        self.assertTrue(
            self.data["facility_admin"].can_delete(self.data["summary_log"])
        )

    def test_coach_summarylog_permissions(self):
        self.assertFalse(
            self.data["facility_coach"].can_create_instance(self.data["summary_log"])
        )
        self.assertTrue(self.data["facility_coach"].can_read(self.data["summary_log"]))
        self.assertFalse(
            self.data["facility_coach"].can_update(self.data["summary_log"])
        )
        self.assertFalse(
            self.data["facility_coach"].can_delete(self.data["summary_log"])
        )

    def test_learner_summarylog_permissions(self):
        learner = self.data["learners_one_group"][0][1]
        self.assertTrue(learner.can_create_instance(self.data["summary_log"]))
        self.assertTrue(learner.can_read(self.data["summary_log"]))
        self.assertTrue(learner.can_update(self.data["summary_log"]))
        self.assertTrue(learner.can_delete(self.data["summary_log"]))


class UserSessionLogPermissionsTestCase(TestCase):
    def setUp(self):
        self.data = create_dummy_facility_data()
        self.data["session_log"] = UserSessionLogFactory.create(
            user=self.data["learners_one_group"][1][1]
        )

    def test_facilityadmin_sessionlog_permissions(self):
        self.assertTrue(
            self.data["facility_admin"].can_create_instance(self.data["session_log"])
        )
        self.assertTrue(self.data["facility_admin"].can_read(self.data["session_log"]))
        self.assertTrue(
            self.data["facility_admin"].can_update(self.data["session_log"])
        )
        self.assertTrue(
            self.data["facility_admin"].can_delete(self.data["session_log"])
        )

    def test_coach_sessionlog_permissions(self):
        self.assertFalse(
            self.data["facility_coach"].can_create_instance(self.data["session_log"])
        )
        self.assertTrue(self.data["facility_coach"].can_read(self.data["session_log"]))
        self.assertFalse(
            self.data["facility_coach"].can_update(self.data["session_log"])
        )
        self.assertFalse(
            self.data["facility_coach"].can_delete(self.data["session_log"])
        )

    def test_learner_sessionlog_permissions(self):
        learner = self.data["learners_one_group"][1][1]
        self.assertTrue(learner.can_create_instance(self.data["session_log"]))
        self.assertTrue(learner.can_read(self.data["session_log"]))
        self.assertTrue(learner.can_update(self.data["session_log"]))
        self.assertTrue(learner.can_delete(self.data["session_log"]))
