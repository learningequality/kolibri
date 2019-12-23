from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from django.urls.exceptions import NoReverseMatch
from mock import patch
from rest_framework.test import APITestCase
from rest_framework.test import APITransactionTestCase

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import DUMMY_PASSWORD
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.translation import get_settings_language
from kolibri.deployment.default.urls import urlpatterns


class KolibriTagNavigationTestCase(APITestCase):
    def test_redirect_to_setup_wizard(self):
        with patch("kolibri.core.views.is_provisioned", return_value=False):
            response = self.client.get(reverse("kolibri:core:root_redirect"))
            self.assertEqual(response.status_code, 302)
            self.assertEqual(
                response.get("location"),
                reverse("kolibri:kolibri.plugins.setup_wizard:setupwizard"),
            )

    def test_redirect_root_to_user_if_not_logged_in(self):
        provision_device()
        response = self.client.get(reverse("kolibri:core:root_redirect"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.get("location"), reverse("kolibri:kolibri.plugins.user:user")
        )

    def test_redirect_root_to_learn_if_logged_in(self):
        facility = FacilityFactory.create()
        do = create_superuser(facility)
        provision_device()
        self.client.login(username=do.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:root_redirect"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.get("location"), reverse("kolibri:kolibri.plugins.learn:learn")
        )


class AllUrlsTest(APITransactionTestCase):

    # Allow codes that may indicate a poorly formed response
    # 412 is returned from endpoints that have required GET params when these are not supplied
    allowed_http_codes = [200, 302, 400, 401, 403, 404, 405, 412]

    def setUp(self):
        provision_device()

    def check_responses(self, credentials=None):  # noqa max-complexity=12
        r"""
        This is a very liberal test, we are mostly just concerned with making sure
        that no pages throw errors (500).
        Adapted from:
        http://stackoverflow.com/questions/14454001/list-all-suburls-and-check-if-broken-in-python#answer-19162337
        Test all pattern in root urlconf and included ones.
        Do GET requests only.
        A pattern is skipped if any of the conditions applies:
            - pattern has no name in urlconf
            - pattern expects any positional parameters
            - pattern expects keyword parameters that are not specified in @default_kwargs
        If response code is not in @allowed_http_codes, fail the test.
        if @credentials dict is specified (e.g. username and password),
            login before run tests.
        If @logout_url is specified, then check if we accidentally logged out
            the client while testing, and login again
        Specify @default_kwargs to be used for patterns that expect keyword parameters,
            e.g. if you specify default_kwargs={'username': 'testuser'}, then
            for pattern url(r'^accounts/(?P<username>[\.\w-]+)/$'
            the url /accounts/testuser/ will be tested.
        If @quiet=False, print all the urls checked. If status code of the response is not 200,
            print the status code.
        """
        if not credentials:
            credentials = {}

        def check_urls(urlpatterns, prefix=""):
            failures = []
            if credentials:
                self.client.login(**credentials)
            for pattern in urlpatterns:
                if hasattr(pattern, "url_patterns"):
                    # this is an included urlconf
                    new_prefix = prefix
                    if pattern.namespace:
                        new_prefix = (
                            prefix + (":" if prefix else "") + pattern.namespace
                        )
                    check_urls(pattern.url_patterns, prefix=new_prefix)
                skip = False
                regex = pattern.regex
                if regex.groups > 0:
                    skip = True
                if hasattr(pattern, "name") and pattern.name:
                    name = pattern.name
                else:
                    # if pattern has no name, skip it
                    skip = True
                    name = ""
                fullname = (prefix + ":" + name) if prefix else name
                if not skip:
                    try:
                        url = reverse(fullname)
                        response = self.client.get(url)
                        if response.status_code not in self.allowed_http_codes:
                            failures.append(
                                "{url} gave status code {status_code}".format(
                                    url=url, status_code=response.status_code
                                )
                            )
                        if url == reverse("kolibri:core:logout"):
                            self.client.login(**credentials)
                    except NoReverseMatch:
                        pass
            self.assertFalse(failures, "\n".join(failures))

        # Some API endpoints start iceqube tasks which can cause the task runner to hang
        # Patch this so that no tasks get started.
        with patch(
            "kolibri.core.webpack.hooks.WebpackBundleHook.bundle", return_value=[]
        ), patch("kolibri.core.tasks.api.queue"), patch(
            "kolibri.core.webpack.hooks.WebpackBundleHook.get_by_unique_id"
        ):
            check_urls(urlpatterns)

    def test_anonymous_responses(self):
        self.check_responses()

    def test_learner_responses(self):
        user = FacilityUserFactory.create()
        self.check_responses(
            credentials={"username": user.username, "password": DUMMY_PASSWORD}
        )

    def test_coach_responses(self):
        user = FacilityUserFactory.create()
        user.facility.add_role(user, role_kinds.COACH)
        self.check_responses(
            credentials={"username": user.username, "password": DUMMY_PASSWORD}
        )

    def test_admin_responses(self):
        user = FacilityUserFactory.create()
        user.facility.add_role(user, role_kinds.ADMIN)
        self.check_responses(
            credentials={"username": user.username, "password": DUMMY_PASSWORD}
        )

    def test_superuser_responses(self):
        facility = FacilityFactory.create()
        user = create_superuser(facility)
        self.check_responses(
            credentials={"username": user.username, "password": DUMMY_PASSWORD}
        )


class LogoutLanguagePersistenceTest(APITestCase):
    def setUp(self):
        provision_device()
        facility = FacilityFactory.create()
        user = create_superuser(facility)
        self.credentials = {"username": user.username, "password": DUMMY_PASSWORD}

    def test_persistent_language_on_namespaced_logout(self):
        # Test that namespaced /{lang_code}/logout persists that namespace.
        # Test a few language codes
        for lang_code in ["sw-tz", "fr-fr", "es-es"]:
            self.client.login(**self.credentials)
            response = self.client.post("/{}/logout".format(lang_code))
            self.assertTrue(lang_code in response.url)

    def test_default_language_without_namespaced_logout(self):
        # Test /logout without any in-path language code. Expect default language setting.
        self.client.login(**self.credentials)
        response = self.client.get("/logout")
        self.assertTrue(get_settings_language() in response.url)

    def test_persistent_session_language_setting_on_logout(self):
        # Test when set on a session.
        from django.utils.translation import LANGUAGE_SESSION_KEY

        self.client.login(**self.credentials)
        session = self.client.session
        session[LANGUAGE_SESSION_KEY] = "sw-tz"
        session.save()
        response = self.client.post("/logout")
        self.assertTrue("sw-tz" in response.url)
