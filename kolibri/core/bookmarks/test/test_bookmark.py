from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.bookmarks.models import Bookmark


def create_the_same_bookmark(user):
    return Bookmark.objects.create(
        facility_user=user, content_id="a", contentnode_id="a", channel_id="a"
    )


class BookmarkTestCase(TestCase):
    def setUp(self):
        self.facility_user = FacilityUser.objects.create(
            username="a", facility=Facility.objects.create(name="a")
        )
        self.first_created_object = create_the_same_bookmark(self.facility_user)

    def test_disallowing_duplicates(self):
        """
        Ensures that the Model does not permit creation of duplicates.
        """
        self.assertRaises(
            IntegrityError, lambda: create_the_same_bookmark(self.facility_user)
        )
