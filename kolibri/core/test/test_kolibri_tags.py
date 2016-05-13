from __future__ import absolute_import, print_function, unicode_literals
from django.test import TestCase
from django.test.utils import override_settings
from mock.mock import patch

from kolibri.core.templatetags import kolibri_tags


class KolibriTagRenderAsUrlTestCase(TestCase):
    test_url = "test/"

    @override_settings(STATIC_URL=test_url)
    def test_render_as_url_url(self):
        chunk = {
            "url": "another_test"
        }
        self.assertEqual(self.test_url + chunk["url"], kolibri_tags.render_as_url(chunk))

    @override_settings(STATIC_URL=test_url)
    def test_render_as_url_public_path(self):
        chunk = {
            "publicPath": "another_test"
        }
        self.assertEqual(self.test_url + chunk["publicPath"], kolibri_tags.render_as_url(chunk))


class KolibriTagRenderAsTagsTestCase(TestCase):
    @patch('kolibri.core.templatetags.kolibri_tags.render_as_url', return_value='')
    @patch('kolibri.core.templatetags.kolibri_tags.mark_safe', side_effect=lambda x: x)
    def test_render_as_tag_js(self, mock_mark_safe, mock_render_as_url):
        bundle = [
            {"name": "test.js"}
        ]
        self.assertEqual('<script type="text/javascript" src=""></script>', kolibri_tags.render_as_tags(bundle))

    @patch('kolibri.core.templatetags.kolibri_tags.render_as_url', return_value='')
    @patch('kolibri.core.templatetags.kolibri_tags.mark_safe', side_effect=lambda x: x)
    def test_render_as_tag_css(self, mock_mark_safe, mock_render_as_url):
        bundle = [
            {"name": "test.css"}
        ]
        self.assertEqual('<link type="text/css" href="" rel="stylesheet"/>', kolibri_tags.render_as_tags(bundle))


class KolibriTagRenderAsAsyncTestCase(TestCase):
    @patch('kolibri.core.templatetags.kolibri_tags.get_webpack_bundle',
           return_value=['test', 'test'])
    @patch('kolibri.core.templatetags.kolibri_tags.mark_safe', side_effect=lambda x: x)
    @patch('kolibri.core.templatetags.kolibri_tags.get_async_events',
           return_value={
               "events": {},
               "once": {}
           })
    @patch('kolibri.core.templatetags.kolibri_tags.render_as_url', return_value='test')
    def test_render_as_async(self, *args):
        self.assertEqual('<script>kolibriGlobal.register_kolibri_module_async("", ["test","test"], {}, {});</script>',
                         kolibri_tags.render_as_async(""))
