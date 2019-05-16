from django.conf import settings
from django.http import HttpResponseNotAllowed
from django.test import TestCase
from django.urls import reverse
from django.urls import translate_url
from django.utils.translation import get_language
from django.utils.translation import LANGUAGE_SESSION_KEY


class I18NTests(TestCase):
    """
    Tests set_language view in kolibri/core/views.py
    Copied from https://github.com/django/django/blob/stable/1.11.x/tests/view_tests/tests/test_i18n.py
    """

    def _get_inactive_language_code(self):
        """Return language code for a language which is not activated."""
        current_language = get_language()
        return [
            code for code, name in settings.LANGUAGES if not code == current_language
        ][0]

    def test_setlang(self):
        """
        The set_language view can be used to change the session language.
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_next_valid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to the "next" argument.
        """
        lang_code = self._get_inactive_language_code()
        next_url = reverse("kolibri:learn:learn")
        post_data = dict(language=lang_code, next=next_url)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:learn:learn"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_next_invalid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to user redirect if the "next" argument is invalid.
        """
        lang_code = self._get_inactive_language_code()
        next_url = "/not/a/real/url"
        post_data = dict(language=lang_code, next=next_url)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_null(self):
        """
        The set_language view can be used to change the session language.
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        post_data = dict(language=None)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_null_next_valid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to the "next" argument.
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        next_url = reverse("kolibri:learn:learn")
        post_data = dict(language=None, next=next_url)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:learn:learn"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_null_next_invalid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to user redirect if the "next" argument is invalid.
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        next_url = "/not/a/real/url"
        post_data = dict(language=None, next=next_url)
        response = self.client.post(reverse("kolibri:core:set_language"), post_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_get(self):
        """
        The set_language view is forbidden to be accessed via GET
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.get(reverse("kolibri:core:set_language"), data=post_data)
        self.assertEqual(type(response), HttpResponseNotAllowed)

    def test_setlang_for_ajax(self):
        """
        The set_language view returns 200 for AJAX calls by default.
        """
        lang_code = self._get_inactive_language_code()
        post_data = dict(language=lang_code)
        response = self.client.post(
            reverse("kolibri:core:set_language"),
            post_data,
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("kolibri:core:redirect_user"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_cookie(self):
        # we force saving language to a cookie rather than a session
        # by excluding session middleware and those which do require it
        test_settings = {
            "MIDDLEWARE": ["django.middleware.common.CommonMiddleware"],
            "LANGUAGE_COOKIE_NAME": "mylanguage",
            "LANGUAGE_COOKIE_AGE": 3600 * 7 * 2,
            "LANGUAGE_COOKIE_DOMAIN": ".example.com",
            "LANGUAGE_COOKIE_PATH": "/test/",
        }
        with self.settings(**test_settings):
            post_data = dict(language="pl")
            response = self.client.post(
                reverse("kolibri:core:set_language"), data=post_data
            )
            language_cookie = response.cookies.get("mylanguage")
            self.assertEqual(language_cookie.value, "pl")
            self.assertEqual(language_cookie["domain"], ".example.com")
            self.assertEqual(language_cookie["path"], "/test/")
            self.assertEqual(language_cookie["max-age"], 3600 * 7 * 2)

    def test_setlang_cookie_null(self):
        # we force saving language to a cookie rather than a session
        # by excluding session middleware and those which do require it
        test_settings = {
            "MIDDLEWARE": ["django.middleware.common.CommonMiddleware"],
            "LANGUAGE_COOKIE_NAME": "mylanguage",
            "LANGUAGE_COOKIE_AGE": 3600 * 7 * 2,
            "LANGUAGE_COOKIE_DOMAIN": ".example.com",
            "LANGUAGE_COOKIE_PATH": "/test/",
        }
        with self.settings(**test_settings):
            post_data = dict(language=None)
            response = self.client.post(
                reverse("kolibri:core:set_language"), data=post_data
            )
            language_cookie = response.cookies.get("mylanguage")
            self.assertTrue(language_cookie)
            self.assertEqual(language_cookie.value, "")
