from django.test import TestCase
from sqlite3 import IntegrityError
from kolibri.core.bookmarks.models import Bookmark
from kolibri.core.auth.models import FacilityUser, Facility


def create_the_same_bookmark():
    return Bookmark.objects.create(
        facility_user=FacilityUser.objects.create(
            username="a",
            facility=Facility.objects.create(name="a")
        ),
        content_id="a",
        contentnode_id="a",
        channel_id="a"
    )


class BookmarkTestCase(TestCase):
    def setUp(self):
        self.first_created_object = create_the_same_bookmark()

    def test_disallowing_duplicates(self):
        """
        Ensures that the Model does not permit creation of duplicates.
        """
        self.assertRaises(IntegrityError, create_the_same_bookmark())
        # We've only made one entry
        self.assertEqual(len(Bookmark.objects.all()), 1)
