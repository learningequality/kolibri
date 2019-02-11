from __future__ import unicode_literals

import os

from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.http.cookie import SimpleCookie
from django.test import override_settings
from django.test import TestCase
from django.urls import clear_url_caches
from django.urls import reverse
from django.utils import translation
from django.utils._os import upath
from django.views.generic import TemplateView
from mock import patch

from kolibri.core.device.translation import i18n_patterns

view = TemplateView.as_view(template_name='dummy.html')

included = [
    url(r'^foo/$', view, name='not-prefixed-included-url'),
]

view = TemplateView.as_view(template_name='dummy.html')

urlpatterns = [
    url(r'^not-prefixed/$', view, name='not-prefixed'),
    url(r'^not-prefixed-include/', include(included)),
]

urlpatterns += i18n_patterns([
    url(r'^prefixed/$', view, name='prefixed'),
    url(r'^prefixed\.xml$', view, name='prefixed_xml'),
])


@override_settings(
    USE_I18N=True,
    LANGUAGE_CODE='en',
    LANGUAGES=[
        ('en', 'English'),
        ('fr-fr', 'French'),
    ],
    MIDDLEWARE=[
        'django.contrib.sessions.middleware.SessionMiddleware',
        'kolibri.core.device.middleware.KolibriLocaleMiddleware',
        'django.middleware.common.CommonMiddleware',
    ],
    ROOT_URLCONF='kolibri.core.device.test.test_locale_middleware',
    TEMPLATES=[{
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(os.path.dirname(upath(__file__)), 'templates')],
    }],
)
class URLTestCaseBase(TestCase):
    """
    TestCase base-class for the URL tests.
    """

    def setUp(self):
        # Make sure the cache is empty before we are doing our tests.
        clear_url_caches()

    def tearDown(self):
        # Make sure we will leave an empty cache for other testcases.
        clear_url_caches()


class URLPrefixTests(URLTestCaseBase):
    """
    Tests if the `i18n_patterns` is adding the prefix correctly.
    """
    def test_not_prefixed(self):
        with translation.override('en'):
            self.assertEqual(reverse('not-prefixed'), '/not-prefixed/')
            self.assertEqual(reverse('not-prefixed-included-url'), '/not-prefixed-include/foo/')
        with translation.override('fr-fr'):
            self.assertEqual(reverse('not-prefixed'), '/not-prefixed/')
            self.assertEqual(reverse('not-prefixed-included-url'), '/not-prefixed-include/foo/')

    def test_prefixed(self):
        with translation.override('en'):
            self.assertEqual(reverse('prefixed'), '/en/prefixed/')
        with translation.override('fr-fr'):
            self.assertEqual(reverse('prefixed'), '/fr-fr/prefixed/')
        with translation.override(None):
            self.assertEqual(reverse('prefixed'), '/%s/prefixed/' % settings.LANGUAGE_CODE)


class URLRedirectTests(URLTestCaseBase):
    """
    Tests if the user gets redirected to the right URL when there is no
    language-prefix in the request URL.
    """
    def test_no_prefix_response(self):
        response = self.client.get('/not-prefixed/')
        self.assertEqual(response.status_code, 200)

    def test_en_prefixed_redirect(self):
        response = self.client.get('/prefixed/', HTTP_ACCEPT_LANGUAGE='en', follow=True)
        self.assertRedirects(response, '/en/prefixed/', 302)

    def test_fr_fr_prefixed_redirect(self):
        response = self.client.get('/prefixed/', HTTP_ACCEPT_LANGUAGE='fr-fr', follow=True)
        self.assertRedirects(response, '/fr-fr/prefixed/', 302)

    def test_fr_fr_prefixed_redirect_session(self):
        session = self.client.session
        session[translation.LANGUAGE_SESSION_KEY] = 'fr-fr'
        session.save()
        response = self.client.get('/prefixed/', follow=True)
        self.assertRedirects(response, '/fr-fr/prefixed/', 302)

    def test_fr_fr_prefixed_redirect_cookie(self):
        self.client.cookies = SimpleCookie({settings.LANGUAGE_COOKIE_NAME: 'fr-fr'})
        response = self.client.get('/prefixed/', follow=True)
        self.assertRedirects(response, '/fr-fr/prefixed/', 302)

    def test_fr_fr_prefixed_redirect_device_setting(self):
        with patch('kolibri.core.device.translation.get_device_language', return_value='fr-fr'):
            response = self.client.get('/prefixed/', follow=True)
            self.assertRedirects(response, '/fr-fr/prefixed/', 302)


class URLRedirectWithoutTrailingSlashTests(URLTestCaseBase):
    """
    Tests the redirect when the requested URL doesn't end with a slash
    """
    def test_not_prefixed_redirect(self):
        response = self.client.get('/not-prefixed', HTTP_ACCEPT_LANGUAGE='en')
        self.assertRedirects(response, '/not-prefixed/', 301)

    def test_en_prefixed_redirect(self):
        response = self.client.get('/prefixed', HTTP_ACCEPT_LANGUAGE='en', follow=True)
        self.assertRedirects(response, '/en/prefixed/', 302)

    def test_fr_fr_prefixed_redirect(self):
        response = self.client.get('/prefixed', HTTP_ACCEPT_LANGUAGE='fr-fr', follow=True)
        self.assertRedirects(response, '/fr-fr/prefixed/', 302)

    def test_en_redirect(self):
        response = self.client.get('/prefixed.xml', HTTP_ACCEPT_LANGUAGE='en', follow=True)
        self.assertRedirects(response, '/en/prefixed.xml', 302)

    def test_fr_fr_redirect(self):
        response = self.client.get('/prefixed.xml', HTTP_ACCEPT_LANGUAGE='fr-fr', follow=True)
        self.assertRedirects(response, '/fr-fr/prefixed.xml', 302)


class URLResponseTests(URLTestCaseBase):
    """
    Tests if the response has the right language-code.
    """
    def test_not_prefixed_with_prefix(self):
        response = self.client.get('/en/not-prefixed/')
        self.assertEqual(response.status_code, 404)
