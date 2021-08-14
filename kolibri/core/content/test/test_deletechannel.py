from django.core.management import call_command
from django.test import TestCase
from mock import call
from mock import patch

from kolibri.core.content import models as content


class DeleteChannelTestCase(TestCase):
    """
    Testcase for delete channel management command
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def delete_channel(self):
        call_command("deletechannel", self.the_channel_id)

    def test_channelmetadata_delete_remove_metadata_object(self):
        self.delete_channel()
        self.assertEqual(0, content.ChannelMetadata.objects.count())

    def test_channelmetadata_delete_remove_contentnodes(self):
        self.delete_channel()
        self.assertEqual(0, content.ContentNode.objects.count())

    def test_channelmetadata_delete_leave_unrelated_contentnodes(self):
        c2c1 = content.ContentNode.objects.get(title="c2c1")
        new_id = c2c1.id[:-1] + "1"
        content.ContentNode.objects.create(
            id=new_id,
            content_id=c2c1.content_id,
            kind=c2c1.kind,
            channel_id=c2c1.channel_id,
            available=True,
            title=c2c1.title,
        )
        self.delete_channel()
        self.assertEqual(1, content.ContentNode.objects.count())

    def test_channelmetadata_delete_remove_file_objects(self):
        self.delete_channel()
        self.assertEqual(0, content.File.objects.count())

    @patch("kolibri.core.content.models.paths.get_content_storage_file_path")
    @patch("kolibri.core.content.models.os.remove")
    def test_channelmetadata_delete_files(self, os_remove_mock, content_file_path):
        path = "testing"
        content_file_path.return_value = path
        num_files = content.LocalFile.objects.filter(available=True).count()
        self.delete_channel()
        os_remove_mock.assert_has_calls([call(path)] * num_files)
