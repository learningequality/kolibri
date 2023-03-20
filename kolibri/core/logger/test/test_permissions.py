"""
Permissions tests on the logging models.
"""
import uuid

from django.test import TestCase

from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import GenerateCSVLogRequestFactory
from .factory_logger import UserSessionLogFactory
from kolibri.core.auth.test.helpers import create_dummy_facility_data


class ContentSessionLogPermissionsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.data["interaction_log"] = ContentSessionLogFactory.create(
            user=cls.data["learners_one_group"][0][0],
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
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.data["summary_log"] = ContentSummaryLogFactory.create(
            user=cls.data["learners_one_group"][0][1],
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
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.data["session_log"] = UserSessionLogFactory.create(
            user=cls.data["learners_one_group"][1][1]
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


class GenerateCSVLogRequestPermissionsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.data = create_dummy_facility_data()
        cls.data["log_request"] = GenerateCSVLogRequestFactory.create(
            facility=cls.data["facility"],
            log_type="summary",
        )

    def test_facility_admin_and_superuser_generatecsvlogrequest_permissions(self):
        """ Facility admins and superusers can create, read, update, or delete CSV Log Requests """
        for user in [
            self.data["superuser"],
            self.data["facility_admin"],
        ]:
            self.assertTrue(user.can_create_instance(self.data["log_request"]))
            self.assertTrue(user.can_read(self.data["log_request"]))
            self.assertTrue(user.can_update(self.data["log_request"]))
            self.assertTrue(user.can_delete(self.data["log_request"]))

    def test_facility_users_generatecsvlogrequest_permissions(self):
        """ Facility coaches and members cannot create, read, update, or delete CSV Log Requests """
        for user in [
            self.data["facility_coach"],
            self.data["learners_one_group"][0][1],
        ]:
            self.assertFalse(user.can_create_instance(self.data["log_request"]))
            self.assertFalse(user.can_read(self.data["log_request"]))
            self.assertFalse(user.can_update(self.data["log_request"]))
            self.assertFalse(user.can_delete(self.data["log_request"]))
