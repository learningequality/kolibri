from __future__ import unicode_literals

import os

from django.conf import settings
from django.test import override_settings
from django.test import TestCase
from django.urls import clear_url_caches
from django.urls import reverse
from django.utils import translation
from django.utils._os import upath
from mock import patch

from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.utils.conf import OPTIONS
from kolibri.utils.tests.helpers import override_option


settings_override_dict = {
    "USE_I18N": True,
    "LANGUAGE_CODE": "en",
    "LANGUAGES": [("en", "English"), ("fr-fr", "French")],
    "MIDDLEWARE": [
        "django.contrib.sessions.middleware.SessionMiddleware",
        "kolibri.core.device.middleware.KolibriLocaleMiddleware",
        "django.middleware.common.CommonMiddleware",
    ],
    "ROOT_URLCONF": "kolibri.core.device.test.locale_middleware_urls",
    "TEMPLATES": [
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "DIRS": [os.path.join(os.path.dirname(upath(__file__)), "templates")],
        }
    ],
}

prefixed_settings_override_dict = settings_override_dict.copy()
prefixed_settings_override_dict[
    "ROOT_URLCONF"
] = "kolibri.core.device.test.prefixed_locale_middleware_urls"


def get_url(url):
    return "/" + OPTIONS["Deployment"]["URL_PATH_PREFIX"].lstrip("/") + url


class URLTestCaseBase(TestCase):
    """
    TestCase base-class for the URL tests.
    """

    def setUp(self):
        # Make sure the cache is empty before we are doing our tests.
        clear_url_caches()
        clear_process_cache()

    def tearDown(self):
        # Make sure we will leave an empty cache for other testcases.
        clear_url_caches()
        clear_process_cache()


class URLPrefixTestsBase(object):
    """
    Tests if the `i18n_patterns` is adding the prefix correctly.
    """

    def test_not_prefixed(self):
        with translation.override("en"):
            self.assertEqual(reverse("not-prefixed"), get_url("not-prefixed/"))
            self.assertEqual(
                reverse("not-prefixed-included-url"),
                get_url("not-prefixed-include/foo/"),
            )
        with translation.override("fr-fr"):
            self.assertEqual(reverse("not-prefixed"), get_url("not-prefixed/"))
            self.assertEqual(
                reverse("not-prefixed-included-url"),
                get_url("not-prefixed-include/foo/"),
            )

    def test_prefixed(self):
        with translation.override("en"):
            self.assertEqual(reverse("prefixed"), get_url("en/prefixed/"))
        with translation.override("fr-fr"):
            self.assertEqual(reverse("prefixed"), get_url("fr-fr/prefixed/"))
        with translation.override(None):
            self.assertEqual(
                reverse("prefixed"), get_url("%s/prefixed/") % settings.LANGUAGE_CODE
            )


@override_settings(**settings_override_dict)
class URLPrefixTests(URLPrefixTestsBase, URLTestCaseBase):
    pass


@override_settings(**prefixed_settings_override_dict)
@override_option("Deployment", "URL_PATH_PREFIX", "test/")
class PrefixedURLPrefixTests(URLPrefixTestsBase, URLTestCaseBase):
    pass


class URLRedirectTestsBase(object):
    """
    Tests if the user gets redirected to the right URL when there is no
    language-prefix in the request URL.
    """

    def test_no_prefix_response(self):
        response = self.client.get(get_url("not-prefixed/"))
        self.assertEqual(response.status_code, 200)

    def test_en_prefixed_redirect(self):
        response = self.client.get(
            get_url("prefixed/"), HTTP_ACCEPT_LANGUAGE="en", follow=True
        )
        self.assertRedirects(response, get_url("en/prefixed/"), 302)

    def test_fr_fr_prefixed_redirect(self):
        response = self.client.get(
            get_url("prefixed/"), HTTP_ACCEPT_LANGUAGE="fr-fr", follow=True
        )
        self.assertRedirects(response, get_url("fr-fr/prefixed/"), 302)

    def test_fr_fr_prefixed_redirect_session(self):
        session = self.client.session
        session[translation.LANGUAGE_SESSION_KEY] = "fr-fr"
        session.save()
        response = self.client.get(get_url("prefixed/"), follow=True)
        self.assertRedirects(response, get_url("fr-fr/prefixed/"), 302)

    def test_fr_fr_prefixed_redirect_device_setting(self):
        with patch(
            "kolibri.core.device.translation.get_device_language", return_value="fr-fr"
        ):
            response = self.client.get(get_url("prefixed/"), follow=True)
            self.assertRedirects(response, get_url("fr-fr/prefixed/"), 302)


@override_settings(**settings_override_dict)
class URLRedirectTests(URLRedirectTestsBase, URLTestCaseBase):
    pass


@override_settings(**prefixed_settings_override_dict)
@override_option("Deployment", "URL_PATH_PREFIX", "test/")
class PrefixedURLRedirectTests(URLRedirectTestsBase, URLTestCaseBase):
    pass


class URLRedirectWithoutTrailingSlashTestsBase(object):
    """
    Tests the redirect when the requested URL doesn't end with a slash
    """

    def test_not_prefixed_redirect(self):
        response = self.client.get(get_url("not-prefixed"), HTTP_ACCEPT_LANGUAGE="en")
        self.assertRedirects(response, get_url("not-prefixed/"), 301)

    def test_en_prefixed_redirect(self):
        response = self.client.get(
            get_url("prefixed"), HTTP_ACCEPT_LANGUAGE="en", follow=True
        )
        self.assertRedirects(response, get_url("en/prefixed/"), 302)

    def test_fr_fr_prefixed_redirect(self):
        response = self.client.get(
            get_url("prefixed"), HTTP_ACCEPT_LANGUAGE="fr-fr", follow=True
        )
        self.assertRedirects(response, get_url("fr-fr/prefixed/"), 302)

    def test_en_redirect(self):
        response = self.client.get(
            get_url("prefixed.xml"), HTTP_ACCEPT_LANGUAGE="en", follow=True
        )
        self.assertRedirects(response, get_url("en/prefixed.xml"), 302)

    def test_fr_fr_redirect(self):
        response = self.client.get(
            get_url("prefixed.xml"), HTTP_ACCEPT_LANGUAGE="fr-fr", follow=True
        )
        self.assertRedirects(response, get_url("fr-fr/prefixed.xml"), 302)


@override_settings(**settings_override_dict)
class URLRedirectWithoutTrailingSlashTests(
    URLRedirectWithoutTrailingSlashTestsBase, URLTestCaseBase
):
    pass


@override_settings(**prefixed_settings_override_dict)
@override_option("Deployment", "URL_PATH_PREFIX", "test/")
class PrefixedURLRedirectWithoutTrailingSlashTests(
    URLRedirectWithoutTrailingSlashTestsBase, URLTestCaseBase
):
    pass


class URLResponseTestsBase(object):
    """
    Tests if the response has the right language-code.
    """

    def test_not_prefixed_with_prefix(self):
        response = self.client.get(get_url("en/not-prefixed/"))
        self.assertEqual(response.status_code, 404)


@override_settings(**settings_override_dict)
class URLResponseTests(URLResponseTestsBase, URLTestCaseBase):
    pass


@override_settings(**prefixed_settings_override_dict)
@override_option("Deployment", "URL_PATH_PREFIX", "test/")
class PrefixedURLResponseTests(URLResponseTestsBase, URLTestCaseBase):
    pass
