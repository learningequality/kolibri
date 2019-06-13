import uuid

from django.core.urlresolvers import reverse
from django.test import TestCase
from mock import patch
from six.moves.urllib.parse import urlencode

from kolibri.core.content.models import ContentNode


class RedirectContentTestCase(TestCase):
    """
    Testcase for viewcontent endpoint
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def _get_url(self, **kwargs):
        url = reverse("kolibri:core:contentpermalink")
        if any(kwargs.values()):
            url += "?"
            url += urlencode({k: v for k, v in kwargs.items() if v is not None})
        return url

    def test_no_params_404(self):
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 404)

    def test_node_id_only_valid(self):
        node_id = ContentNode.objects.first().id
        response = self.client.get(self._get_url(node_id=node_id))
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        self.assertTrue(node_id in response.url)

    def test_node_id_only_invalid(self):
        response = self.client.get(self._get_url(node_id="rubbish"))
        self.assertEqual(response.status_code, 404)

    def test_node_id_and_content_id_valid(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(node_id=node.id, content_id=node.content_id)
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        self.assertTrue(node.id in response.url)

    def test_node_id_and_content_id_and_channel_id_valid(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(
                node_id=node.id, content_id=node.content_id, channel_id=node.channel_id
            )
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        self.assertTrue(node.id in response.url)

    def test_node_id_missing_and_content_id_and_channel_id_valid(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(
                node_id=uuid.uuid4().hex,
                content_id=node.content_id,
                channel_id=node.channel_id,
            )
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        # Can make this assertion because this node is unique
        self.assertTrue(node.id in response.url)

    def test_node_id_missing_and_content_id_valid_and_channel_id_missing(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(
                node_id=uuid.uuid4().hex,
                content_id=node.content_id,
                channel_id=uuid.uuid4().hex,
            )
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        # Can make this assertion because this node is unique
        self.assertTrue(node.id in response.url)

    def test_node_id_missing_and_content_id_missing_and_channel_id_missing(self):
        response = self.client.get(
            self._get_url(
                node_id=uuid.uuid4().hex,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_node_id_invalid_and_content_id_and_channel_id_valid(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(
                node_id="rubbish",
                content_id=node.content_id,
                channel_id=node.channel_id,
            )
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        # Can make this assertion because this node is unique
        self.assertTrue(node.id in response.url)

    def test_node_id_invalid_and_content_id_valid_and_channel_id_invalid(self):
        node = ContentNode.objects.first()
        response = self.client.get(
            self._get_url(
                node_id="rubbish", content_id=node.content_id, channel_id="rubbish"
            )
        )
        self.assertEqual(response.status_code, 302)
        # This is true for our default learn urls for now.
        # Can make this assertion because this node is unique
        self.assertTrue(node.id in response.url)

    def test_node_id_invalid_and_content_id_invalid_and_channel_id_invalid(self):
        response = self.client.get(
            self._get_url(node_id="rubbish", content_id="rubbish", channel_id="rubbish")
        )
        self.assertEqual(response.status_code, 404)

    def test_node_id_only_valid_no_hooks_404(self):
        node_id = ContentNode.objects.first().id
        with patch("kolibri.core.content.views.ContentNodeDisplayHook") as hook_mock:
            hook_mock.registered_hooks.return_value = []
            response = self.client.get(self._get_url(node_id=node_id))
            self.assertEqual(response.status_code, 404)
