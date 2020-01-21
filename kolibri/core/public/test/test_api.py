import platform
import uuid

import factory
from django.core.urlresolvers import reverse
from le_utils.constants import content_kinds
from morango.models import InstanceIDModel
from rest_framework.test import APITransactionTestCase
from six import iteritems

import kolibri
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.device.utils import set_device_settings


class ContentNodeFactory(factory.DjangoModelFactory):
    class Meta:
        model = ContentNode

    id = factory.LazyFunction(uuid.uuid4)
    content_id = factory.LazyFunction(uuid.uuid4)
    title = factory.Sequence(lambda n: "contentnode%d" % n)
    available = True
    lang_id = "en"


class FileFactory(factory.DjangoModelFactory):
    class Meta:
        model = File

    id = factory.LazyFunction(uuid.uuid4)


class LocalFileFactory(factory.DjangoModelFactory):
    class Meta:
        model = LocalFile

    available = True
    file_size = 10


def create_mini_channel(
    channel_name="channel", channel_id=uuid.uuid4(), root_lang="en"
):
    root = ContentNodeFactory.create(
        kind=content_kinds.TOPIC, channel_id=channel_id, lang_id=root_lang
    )
    child1 = ContentNodeFactory.create(
        parent=root, kind=content_kinds.VIDEO, channel_id=channel_id
    )
    dupe_content_id = uuid.uuid4().hex
    child2 = ContentNodeFactory.create(
        parent=root,
        kind=content_kinds.VIDEO,
        channel_id=channel_id,
        content_id=dupe_content_id,
    )
    # create child3 node with duplicate content_id
    ContentNodeFactory.create(
        parent=child1,
        kind=content_kinds.VIDEO,
        channel_id=channel_id,
        content_id=dupe_content_id,
    )
    l1 = LocalFileFactory.create(id=uuid.uuid4().hex)
    l2 = LocalFileFactory.create(id=uuid.uuid4().hex)
    FileFactory.create(contentnode=child1, local_file=l1)
    FileFactory.create(contentnode=child2, local_file=l2)
    return ChannelMetadata.objects.create(
        id=channel_id, name=channel_name, min_schema_version=1, root=root
    )


class PublicAPITestCase(APITransactionTestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    def setUp(self):
        provision_device()
        Language.objects.create(id="en", lang_code="en")
        Language.objects.create(id="es", lang_code="es")
        self.channel_id1 = uuid.uuid4().hex
        self.channel_id2 = uuid.uuid4().hex
        create_mini_channel(channel_name="math", channel_id=self.channel_id1)
        channel2 = create_mini_channel(
            channel_name="science", channel_id=self.channel_id2, root_lang="es"
        )
        set_channel_metadata_fields(channel2.id, public=True)

    def test_info_endpoint(self):
        response = self.client.get(reverse("kolibri:core:info-list"))
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["kolibri_version"], kolibri.__version__)
        self.assertEqual(response.data["instance_id"], instance_model.id)
        self.assertEqual(response.data["device_name"], instance_model.hostname)
        self.assertEqual(response.data["operating_system"], platform.system())

    def test_public_channel_list(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/"))
        data = response.json()
        self.assertEqual(len(data), 2)

    def test_public_channel_list_filter_keyword(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/", keyword="zzz"))
        self.assertEqual(len(response.json()), 0)
        response = self.client.get(get_channel_lookup_url(baseurl="/", keyword="math"))
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id1)

    def test_public_channel_list_filter_language(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="zu"))
        self.assertEqual(len(response.json()), 0)
        # filter based on contentnode languages
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="en"))
        self.assertEqual(len(response.json()), 2)
        # filter based on root contentnode language
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="es"))
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id2)

    def test_public_channel_list_filter_keyword_language(self):
        response = self.client.get(
            get_channel_lookup_url(baseurl="/", keyword="zzz", language="es")
        )
        self.assertEqual(len(response.json()), 0)
        response = self.client.get(
            get_channel_lookup_url(baseurl="/", keyword="science", language="es")
        )
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id2)

    def test_public_channel_list_no_version(self):
        response = self.client.get(get_channel_lookup_url(version="100000"))
        self.assertEqual(response.status_code, 404)

    def test_public_channel_lookup(self):
        response = self.client.get(
            get_channel_lookup_url(identifier=self.channel_id2), format="json"
        )
        data = response.json()
        self.assertEqual(len(data), 1)
        data = data[0]
        expected = {
            "id": self.channel_id2,
            "name": "science",
            "language": "es",  # root node language
            "description": "",
            "total_resource_count": 2,  # should account for nodes with duplicate content_ids
            "version": 0,
            "published_size": 20,
            "last_published": None,
            "icon_encoding": "",
            "matching_tokens": [],
            "public": True,
        }
        for key, value in iteritems(expected):
            self.assertEqual(data[key], value)
        # we don't care what order these elements are in
        self.assertSetEqual(set(["en", "es"]), set(data["included_languages"]))

    def test_public_channel_lookup_no_version(self):
        response = self.client.get(
            get_channel_lookup_url(identifier=uuid.uuid4().hex, version="100000")
        )
        self.assertEqual(response.status_code, 404)

    def test_public_channel_lookup_no_channel(self):
        response = self.client.get(get_channel_lookup_url(identifier=uuid.uuid4().hex))
        self.assertEqual(response.status_code, 404)

    def test_public_checksum_lookup_no_checksums(self):
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=[],
            format="json",
        )
        self.assertEqual(int(response.content), 0)

    def test_public_checksum_lookup_not_available(self):
        LocalFile.objects.all().update(available=True)
        test = LocalFile.objects.all().first()
        test.available = False
        test.save()
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=[test.id],
            format="json",
        )
        self.assertEqual(int(response.content), 0)

    def test_public_checksum_lookup_two_available(self):
        LocalFile.objects.all().update(available=True)
        ids = LocalFile.objects.all()[:2].values_list("id", flat=True)
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=ids,
            format="json",
        )
        self.assertEqual(int(response.content), 3)

    def test_public_checksum_lookup_one_available(self):
        LocalFile.objects.all().update(available=True)
        ids = LocalFile.objects.all().order_by("id")[:2].values_list("id", flat=True)
        test = LocalFile.objects.all().order_by("id")[0]
        test.available = False
        test.save()
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=ids,
            format="json",
        )
        self.assertEqual(int(response.content), 2)

    def test_public_filter_unlisted(self):
        set_device_settings(allow_peer_unlisted_channel_import=False)
        unlisted_channel_id = uuid.uuid4().hex
        create_mini_channel(channel_name="math 2", channel_id=unlisted_channel_id)
        set_channel_metadata_fields(unlisted_channel_id, public=False)

        response = self.client.get(get_channel_lookup_url(baseurl="/"))
        data = response.json()
        self.assertEqual(len(data), 2)
