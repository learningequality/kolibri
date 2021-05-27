from django.db.utils import IntegrityError
from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.bookmarks.models import Bookmark


def create_the_same_bookmark(user):
    return Bookmark.objects.create(
        user=user,
        content_id="4d2dea0cdd424c6ab5f76e8244507d6e",
        contentnode_id="4d2dea0cdd424c6ab5f76e8244507d6e",
        channel_id="a4d2dea0cdd424cab5f76e8244507d6e",
    )


class BookmarkTestCase(TestCase):
    def setUp(self):
        self.user = FacilityUser.objects.create(
            username="a", facility=Facility.objects.create(name="a")
        )
        self.first_created_object = create_the_same_bookmark(self.user)

    def test_disallowing_duplicates(self):
        """
        Ensures that the Model does not permit creation of duplicates.
        """
        self.assertRaises(IntegrityError, lambda: create_the_same_bookmark(self.user))
