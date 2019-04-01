from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

import mock
from django.core.management import call_command
from django.test import TestCase
from mock import patch

from .. import models as auth_models
from ..management.commands import deprovision
from .helpers import setup_device
from .test_api import ClassroomFactory
from .test_api import LearnerGroupFactory
from kolibri.core.content import models as content_models
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.core.logger.test.factory_logger import UserSessionLogFactory


def count_instances(models):
    return sum([model.objects.count() for model in models])


class UserImportCommandTestCase(TestCase):
    """
    Tests for the deprovision command.
    """

    fixtures = ["content_test.json"]

    def setUp(self):
        facility, superuser = setup_device()
        ContentSessionLogFactory.create(
            content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        for classroom in [ClassroomFactory.create(parent=facility) for _ in range(3)]:
            for group in [
                LearnerGroupFactory.create(parent=classroom) for _ in range(3)
            ]:
                user = FacilityUserFactory.create(facility=facility)
                auth_models.Membership.objects.create(collection=group, user=user)
                ContentSessionLogFactory.create(
                    user=user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
                )
                ContentSummaryLogFactory.create(
                    user=user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
                )
                UserSessionLogFactory.create(user=user)

    @patch("django.utils.six.moves.input", new=lambda x: "yes")
    def test_setup_no_headers_bad_user_good_user(self):
        deprovision.input = mock.MagicMock(name="input", return_value="yes")
        models_that_should_get_deleted = deprovision.MODELS_TO_DELETE + [
            auth_models.FacilityUser,
            auth_models.Facility,
        ]
        models_that_should_remain = [
            content_models.LocalFile,
            content_models.ContentNode,
            content_models.File,
            content_models.AssessmentMetaData,
        ]
        assert count_instances(models_that_should_get_deleted) > 0
        assert count_instances(models_that_should_remain) > 0
        call_command("deprovision")
        assert count_instances(models_that_should_get_deleted) == 0
        assert count_instances(models_that_should_remain) > 0
