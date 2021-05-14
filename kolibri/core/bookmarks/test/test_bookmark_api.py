from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_403_FORBIDDEN
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.bookmarks.models import Bookmark


class BookmarkAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory(facility=cls.facility)
        cls.user2 = FacilityUserFactory(facility=cls.facility)

    def setUp(self):
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        self.the_same_bookmark_data = {
            "content_id": "1",
            "contentnode_id": "1",
            "channel_id": "1",
        }

    def test_create_bookmark_correctly(self):
        """
        Ensures that a user may create bookmarks successfully when logged in.
        """
        response = self.client.post(
            "/api/bookmarks/bookmarks/", self.the_same_bookmark_data, format="json"
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)

    def test_create_bookmark_missing_keys(self):
        """
        Ensures that the proper HTTP_400_BAD_REQUEST status comes back when
        the required fields are missing
        """
        data = {"content_id": "2", "channel_id": "2"}
        response = self.client.post("/api/bookmarks/bookmarks/", data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertTrue("contentnode_id" in response.data)

    def test_create_duplicate_bookmark(self):
        """
        Ensures that duplicate bookmarks cannot be created but that the client
        receives the data they would have if it were. We expect it to return 200
        because the request is ultimately OK - but we didn't create anything.
        """
        acceptable_response = self.client.post(
            "/api/bookmarks/bookmarks/", self.the_same_bookmark_data, format="json"
        )
        duplicate_response = self.client.post(
            "/api/bookmarks/bookmarks/", self.the_same_bookmark_data, format="json"
        )
        self.assertEqual(duplicate_response.status_code, HTTP_200_OK)
        self.assertDictEqual(duplicate_response.data, acceptable_response.data)

    def test_get_bookmarks(self):
        """
        Ensures that the user gets their bookmarks back when they request them
        and that they only get *theirs*.
        """
        bookmark, _ = Bookmark.objects.get_or_create(
            facility_user=self.user, **self.the_same_bookmark_data
        )
        other_users_bookmark, _ = Bookmark.objects.get_or_create(
            facility_user=self.user2, **self.the_same_bookmark_data
        )
        response = self.client.get("/api/bookmarks/bookmarks/")
        self.assertEqual(response.status_code, HTTP_200_OK)
        # Make sure there actually are more than just what we're getting back
        # so we're sure the permissions are applied as expected
        users_bookmarks = Bookmark.objects.filter(facility_user=self.user)
        self.assertTrue(len(Bookmark.objects.all()) > len(users_bookmarks))
        for bookmark_entry in response.data:
            # We're going to filter the users_bookmarks QuerySet over and over
            # to be sure that everything we get from the API exists there which
            # means that we're only getting the bookmarks from the logged in user
            marks = users_bookmarks
            self.assertEqual(
                # Try to filter down self.user's bookmarks to
                len(marks.filter(pk=bookmark_entry["id"])),
                1,
            )

    def test_destroy_bookmarks(self):
        """
        Ensures that users can destroy their bookmarks and ONLY THEIR bookmarks
        """

        def delete_one(id):
            return self.client.delete("/api/bookmarks/bookmarks/{}/".format(id))

        users_bookmarks = Bookmark.objects.filter(facility_user=self.user)
        if not len(users_bookmarks):
            my_bookmark, _ = Bookmark.objects.get_or_create(
                facility_user=self.user, **self.the_same_bookmark_data
            )
        else:
            my_bookmark = users_bookmarks[0]

        response_delete_mine = delete_one(my_bookmark.id)
        self.assertEqual(response_delete_mine.status_code, HTTP_204_NO_CONTENT)

        # Now to try deleting someone else's!
        user2s_bookmarks = Bookmark.objects.filter(facility_user=self.user2)
        if not len(user2s_bookmarks):
            their_bookmark, _ = Bookmark.objects.get_or_create(
                facility_user=self.user2, **self.the_same_bookmark_data
            )
        else:
            their_bookmark = user2s_bookmarks[0]

        response_delete_theirs = delete_one(their_bookmark.id)
        self.assertEqual(response_delete_theirs.status_code, HTTP_403_FORBIDDEN)
