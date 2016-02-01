"""
"""
import os
import shutil
from django.test import TestCase
from django.core.management import call_command
from django.db import connections
from django.test.utils import override_settings
from kolibri.content import models as content
from kolibri.content import api
from django.conf import settings


@override_settings(DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    },

    'content_test': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    },
})
class ContentMetadataTestCase(TestCase):
    """testcase for ContentMetadata models"""
    # fixtures = ['k_dumb.json', "content_test.json"]
    multi_db = True
    # the_channel_id = api.get_channel_id('khan')
    the_channel_id = 'content_test'

    """Tests for ContentMetadata API methods"""
    def test_update_content_copy(self):
        fpath_1 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/kolibri_content/files_for_testing/Magnum_ChargerInverter.pdf"
        fm_1 = content.Format.objects.using(self.the_channel_id).get(format_size=102)
        fm_3 = content.Format.objects.using(self.the_channel_id).get(format_size=46)
        the_file = content.File.objects.using(self.the_channel_id).get(format=fm_1)
        api.update_content_copy(the_file, fpath_1)
        the_file = content.File.objects.using(self.the_channel_id).filter(format=fm_3)[1]
        api.update_content_copy(the_file, fpath_1)

        fpath_2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/kolibri_content/files_for_testing/y2-uaPiyoxc.mp4"
        fm_2 = content.Format.objects.using(self.the_channel_id).get(format_size=51)
        the_file = content.File.objects.using(self.the_channel_id).get(format=fm_2)
        self.assertFalse(the_content.file.content_copy)
        api.update_content_copy(the_file, fpath_2)
        self.assertTrue(the_content.file.content_copy)
        api.update_content_copy(the_file, None)
        self.assertFalse(the_content.file.content_copy)
        self.assertFalse(the_content.file.checksum)

    def test_get_content_with_id(self):
        """test for single content_id"""
        the_content_id = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root").content_id
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title="root")
        actual_output = api.get_content_with_id(the_content_id, channel_id=self.the_channel_id)
        self.assertEqual(set(expected_output), set(actual_output))
        """test for a list of content_ids"""
        the_content_ids = [cm.content_id for cm in content.ContentMetadata.objects.using(self.the_channel_id).all() if cm.title in ["root", "c1", "c2c2"]]
        expected_output2 = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["root", "c1", "c2c2"])
        actual_output2 = api.get_content_with_id(the_content_ids, channel_id=self.the_channel_id)
        self.assertEqual(set(expected_output2), set(actual_output2))

    def test_get_ancestor_topics(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c2c3")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["root", "c2"])
        actual_output = api.get_ancestor_topics(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_immediate_children(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["c1", "c2"])
        actual_output = api.immediate_children(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_leaves(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c2")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["c2c1", "c2c2", "c2c3"])
        actual_output = api.leaves(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_all_formats(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c2")
        expected_output = content.Format.objects.using(self.the_channel_id).filter(format_size=46)
        actual_output = api.get_all_formats(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_available_formats(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c2")
        expected_output = []
        actual_output = api.get_available_formats(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_possible_formats(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c1")
        expected_output = content.Format.objects.using(self.the_channel_id).filter(format_size__in=[51, 102])
        actual_output = api.get_possible_formats(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_files_for_quality(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c1")
        fm = content.Format.objects.using(self.the_channel_id).get(format_size=102)
        expected_output = content.File.objects.using(self.the_channel_id).filter(format=fm)
        actual_output = api.get_files_for_quality(channel_id=self.the_channel_id, content=p, format_quality="high")
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_missing_files(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root")
        expected_output = content.File.objects.using(self.the_channel_id).exclude(checksum__in=["e8656a89a138d05feca0f1f9bb422759"])
        actual_output = api.get_missing_files(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_all_prerequisites(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c1")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["root"])
        actual_output = api.get_all_prerequisites(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_all_related(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c1")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["c2"])
        actual_output = api.get_all_related(channel_id=self.the_channel_id, content=p)
        self.assertEqual(set(expected_output), set(actual_output))

    def test_set_prerequisite(self):
        root = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root")
        c2 = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c2")
        self.assertFalse(api.get_all_prerequisites(channel_id=self.the_channel_id, content=c2))
        api.set_prerequisite(channel_id=self.the_channel_id, content1=root, content2=c2)
        self.assertTrue(api.get_all_prerequisites(channel_id=self.the_channel_id, content=c2))

    def test_set_is_related(self):
        root = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root")
        c1 = content.ContentMetadata.objects.using(self.the_channel_id).get(title="c1")
        self.assertFalse(root in api.get_all_related(channel_id=self.the_channel_id, content=c1))
        api.set_is_related(channel_id=self.the_channel_id, content1=c1, content2=root)
        self.assertTrue(root in api.get_all_related(channel_id=self.the_channel_id, content=c1))

    def test_children_of_kind(self):
        p = content.ContentMetadata.objects.using(self.the_channel_id).get(title="root")
        expected_output = content.ContentMetadata.objects.using(self.the_channel_id).filter(title__in=["c2", "c2c2", "c2c3"])
        actual_output = api.children_of_kind(channel_id=self.the_channel_id, content=p, kind="topic")
        self.assertEqual(set(expected_output), set(actual_output))


    """Tests for channel API methods"""
    def test_get_available_channels(self):
        c1 = api.get_channel('ucsd')
        c2 = api.get_channel('khan')
        expected_output = [c1, c2]
        actual_output = api.get_available_channels()
        self.assertEqual(set(expected_output), set(actual_output))

    def test_get_channel(self):
        expected_output = content.ChannelMetadata.objects.get(name='ucsd')
        get_by_name = api.get_channel('ucsd')
        get_by_id = api.get_channel(str(expected_output.channel_id))
        self.assertEqual(expected_output, get_by_name)
        self.assertEqual(expected_output, get_by_id)

    def test_get_channel_name(self):
        expected_output = 'khan'
        ch_id = str(content.ChannelMetadata.objects.get(name='khan').channel_id)
        actual_output = api.get_channel_name(ch_id)
        self.assertEqual(expected_output, actual_output)

    def test_get_channel_id(self):
        expected_output = str(content.ChannelMetadata.objects.get(name='ucsd').channel_id)
        actual_output = api.get_channel_id('ucsd')
        self.assertEqual(expected_output, actual_output)

    def test_get_channel_author(self):
        expected_output = 'eli'
        actual_output_by_name = api.get_channel_author('ucsd')
        self.assertEqual(expected_output, actual_output_by_name)
        actual_output_by_id = api.get_channel_author(api.get_channel_id('ucsd'))
        self.assertEqual(expected_output, actual_output_by_id)

    def test_get_channel_description(self):
        expected_output = 'dummy khan'
        actual_output_by_name = api.get_channel_description('khan')
        self.assertEqual(expected_output, actual_output_by_name)
        actual_output_by_id = api.get_channel_description(api.get_channel_id('khan'))
        self.assertEqual(expected_output, actual_output_by_id)

    def test_get_channel_theme(self):
        expected_output = "i'm a json blob"
        actual_output = api.get_channel_theme('khan')
        self.assertEqual(expected_output, actual_output)

    """clean up"""
    @classmethod
    def tearDownClass(self):
        try:
            shutil.rmtree(settings.CONTENT_COPY_DIR)
        except:
            pass
