import mock
from django.test import TestCase
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.kolibri_plugin import PicturePasswordsSyncHook
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

_PICTURE_PASSWORD_SETTINGS = {"icon_style": "standard", "show_icon_text": True}


class PicturePasswordsSyncHookTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.facility = Facility.objects.create(name="Test Facility")
        self.facility.dataset.learner_can_edit_password = False
        self.facility.dataset.picture_password_settings = _PICTURE_PASSWORD_SETTINGS
        self.facility.dataset.save()
        self.context = mock.MagicMock(spec=LocalSessionContext(), is_receiver=True)
        self.hook = PicturePasswordsSyncHook()
        self.dataset_id = self.facility.dataset_id

    def _call_post_transfer(self, **kwargs):
        params = dict(
            dataset_id=self.dataset_id,
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
            context=self.context,
        )
        params.update(kwargs)
        self.hook.post_transfer(**params)

    def test_skips_when_not_receiver(self):
        self.context.is_receiver = False
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self._call_post_transfer()
        learner.refresh_from_db()
        self.assertIsNone(learner.picture_password)

    @mock.patch("kolibri.core.auth.kolibri_plugin.get_learner_count")
    def test_clears_learner_count_cache_on_receive(self, mock_learner_count):
        self._call_post_transfer()
        mock_learner_count.clear.assert_called_once_with(self.dataset_id)

    def test_skips_when_local_is_single_user(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self._call_post_transfer(local_is_single_user=True)
        learner.refresh_from_db()
        self.assertIsNone(learner.picture_password)

    def test_skips_when_no_picture_password_settings(self):
        self.facility.dataset.picture_password_settings = None
        self.facility.dataset.save()
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self._call_post_transfer()
        learner.refresh_from_db()
        self.assertIsNone(learner.picture_password)

    @mock.patch(
        "kolibri.core.auth.kolibri_plugin.are_picture_passwords_exhausted",
        return_value=True,
    )
    def test_skips_when_exhausted(self, mock_exhausted):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self._call_post_transfer()
        learner.refresh_from_db()
        self.assertIsNone(learner.picture_password)

    def test_assigns_password_to_learner_without_one(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.assertIsNone(learner.picture_password)
        self._call_post_transfer()
        learner.refresh_from_db()
        self.assertIsNotNone(learner.picture_password)

    def test_does_not_overwrite_existing_password(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility, picture_password="1.2.3"
        )
        self._call_post_transfer()
        learner.refresh_from_db()
        self.assertEqual(learner.picture_password, "1.2.3")

    def test_skips_coaches(self):
        coach = FacilityUser.objects.create(username="coach", facility=self.facility)
        self.facility.add_coach(coach)
        self._call_post_transfer()
        coach.refresh_from_db()
        self.assertIsNone(coach.picture_password)

    def test_skips_admins(self):
        admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.facility.add_admin(admin)
        self._call_post_transfer()
        admin.refresh_from_db()
        self.assertIsNone(admin.picture_password)

    @mock.patch("kolibri.core.auth.kolibri_plugin.assign_picture_password")
    def test_catches_no_available_sequences_and_stops(self, mock_assign):
        FacilityUser.objects.create(username="learner1", facility=self.facility)
        FacilityUser.objects.create(username="learner2", facility=self.facility)
        mock_assign.side_effect = NoAvailableSequences("no sequences")
        with self.assertLogs("kolibri.core.auth.kolibri_plugin", level="ERROR"):
            self._call_post_transfer()
        self.assertEqual(mock_assign.call_count, 1)
