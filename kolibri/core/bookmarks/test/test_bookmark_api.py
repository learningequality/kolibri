import uuid

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
from kolibri.core.content.models import ContentNode


class BookmarkAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory(facility=cls.facility)
        cls.user2 = FacilityUserFactory(facility=cls.facility)
        cls.contentnode = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="root",
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
        )

    def setUp(self):
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        self.base_data = lambda user, model_data=False: {
            "contentnode_id": self.contentnode.id,
            "user": user if model_data else user.id,
        }
        self.user1_data = self.base_data(self.user)
        self.user2_data = self.base_data(self.user2)

    def test_create_bookmark_correctly(self):
        """
        Ensures that a user may create bookmarks successfully when logged in.
        """
        response = self.client.post(
            "/api/bookmarks/bookmarks/", self.user1_data, format="json"
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)

    def test_create_only_your_own_bookmarks(self):
        """
        Ensures that a user can only create a bookmark for themselves.
        """
        response = self.client.post(
            "/api/bookmarks/bookmarks/", self.user2_data, format="json"
        )
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)

    def test_create_bookmark_missing_contentnode_id(self):
        """
        Ensures that the proper HTTP_400_BAD_REQUEST status comes back when
        the required fields are missing
        """
        busted_data = {"user": self.user.id}
        response = self.client.post(
            "/api/bookmarks/bookmarks/", busted_data, format="json"
        )
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertEqual("contentnode_id", response.data[0]["metadata"]["field"])

    def test_create_duplicate_bookmark(self):
        """
        Ensures that duplicate bookmarks cannot be created but that the client
        receives the data they would have if it were. We expect it to return 200
        because the request is ultimately OK - but we didn't create anything.
        """
        self.client.post("/api/bookmarks/bookmarks/", self.user1_data, format="json")
        duplicate_response = self.client.post(
            "/api/bookmarks/bookmarks/", self.user1_data, format="json"
        )
        self.assertEqual(duplicate_response.status_code, HTTP_400_BAD_REQUEST)

    def test_get_bookmarks(self):
        """
        Ensures that the user gets their bookmarks back when they request them
        and that they only get *theirs*.
        """
        bookmark, _ = Bookmark.objects.get_or_create(
            **self.base_data(self.user, model_data=True)
        )
        other_users_bookmark, _ = Bookmark.objects.get_or_create(
            **self.base_data(self.user2, model_data=True)
        )

        response = self.client.get("/api/bookmarks/bookmarks/")
        self.assertEqual(response.status_code, HTTP_200_OK)

        # Make sure there actually are more than just what we're getting back
        # so we're sure the permissions are applied as expected
        users_bookmarks = Bookmark.objects.filter(user=self.user)
        self.assertTrue(len(Bookmark.objects.all()) > len(users_bookmarks))
        for bookmark_entry in response.data:
            # We're going to filter the users_bookmarks QuerySet over and over
            # to be sure that everything we get from the API exists there which
            # means that we're only getting the bookmarks from the logged in user
            users_bookmarks_clone = users_bookmarks
            self.assertEqual(
                # Try to filter down self.user's bookmarks to those which include
                # user's id - which means bookmark_entry is owned by user
                len(users_bookmarks_clone.filter(pk=bookmark_entry["id"])),
                1,
            )

    def test_destroy_bookmarks(self):
        """
        Ensures that users can destroy their bookmarks and ONLY THEIR bookmarks
        """

        def delete_one(id):
            try:
                # Try getting the id before deleting it because it should exist within the
                # context of this test.
                Bookmark.objects.get(pk=id)
                return self.client.delete("/api/bookmarks/bookmarks/{}/".format(id))
            except Bookmark.DoesNotExist:
                self.fail(
                    "Bookmark with id {} should exist at this point because you've not deleted it yet.".format(
                        id
                    )
                )

        user1s_bookmarks = Bookmark.objects.filter(user=self.user)

        if not len(user1s_bookmarks):
            user1_bookmark, _ = Bookmark.objects.get_or_create(
                **self.base_data(self.user, model_data=True)
            )
        else:
            user1_bookmark = user1s_bookmarks[0]

        response_delete_mine = delete_one(user1_bookmark.id)
        self.assertEqual(response_delete_mine.status_code, HTTP_204_NO_CONTENT)
        self.assertRaises(
            Bookmark.DoesNotExist, lambda: Bookmark.objects.get(pk=user1_bookmark.id)
        )

        # Now to try deleting someone else's!
        user2s_bookmarks = Bookmark.objects.filter(user=self.user2)
        if not len(user2s_bookmarks):
            their_bookmark, _ = Bookmark.objects.get_or_create(
                **self.base_data(self.user2, model_data=True)
            )
        else:
            their_bookmark = user2s_bookmarks[0]

        response_delete_theirs = delete_one(their_bookmark.id)
        self.assertEqual(response_delete_theirs.status_code, HTTP_403_FORBIDDEN)
