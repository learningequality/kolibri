from django.http import HttpResponseRedirect
from django.test import TestCase
from mock import MagicMock
from mock import patch

from kolibri.core.device.middleware import ProvisioningErrorHandler
from kolibri.core.device.utils import DeviceNotProvisioned


def mock_redirect(url):
    """
    Mock redirect function that returns an HttpResponseRedirect without URL resolution.
    """
    response = HttpResponseRedirect(url)
    return response


class ProvisioningErrorHandlerTestCase(TestCase):
    """
    Tests for ProvisioningErrorHandler middleware.
    """

    def setUp(self):
        self.get_response = MagicMock(return_value=MagicMock(status_code=200))
        self.middleware = ProvisioningErrorHandler(self.get_response)

    def _make_request(self, path):
        request = MagicMock()
        request.path = path
        return request

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_provisioned_device_allows_request(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is provisioned, requests should pass through normally.
        """
        mock_device_provisioned.return_value = True

        request = self._make_request("/en/learn/")
        response = self.middleware(request)

        self.get_response.assert_called_once_with(request)
        self.assertEqual(response.status_code, 200)

    @patch("kolibri.core.device.middleware.redirect", side_effect=mock_redirect)
    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_redirects_learn_to_setup(
        self, mock_setup_hook, mock_device_provisioned, mock_redir
    ):
        """
        When device is not provisioned, requests to /learn/ should redirect to setup.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/learn/")
        response = self.middleware(request)

        self.get_response.assert_not_called()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/en/setup/")

    @patch("kolibri.core.device.middleware.redirect", side_effect=mock_redirect)
    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_redirects_library_to_setup(
        self, mock_setup_hook, mock_device_provisioned, mock_redir
    ):
        """
        When device is not provisioned, requests to /library/ should redirect to setup.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/library/")
        response = self.middleware(request)

        self.get_response.assert_not_called()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/en/setup/")

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_allows_setup_wizard(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is not provisioned, setup wizard requests should pass through.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/setup/")
        response = self.middleware(request)

        self.get_response.assert_called_once_with(request)
        self.assertEqual(response.status_code, 200)

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_allows_api_endpoints(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is not provisioned, API requests should pass through.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/api/device/deviceprovision/")
        response = self.middleware(request)

        self.get_response.assert_called_once_with(request)
        self.assertEqual(response.status_code, 200)

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_allows_static_assets(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is not provisioned, static asset requests should pass through.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/static/kolibri/app.js")
        response = self.middleware(request)

        self.get_response.assert_called_once_with(request)
        self.assertEqual(response.status_code, 200)

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_no_setup_hook_allows_request(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is not provisioned but no setup hook is registered,
        requests should pass through (graceful degradation).
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.side_effect = StopIteration

        request = self._make_request("/en/learn/")
        response = self.middleware(request)

        self.get_response.assert_called_once_with(request)
        self.assertEqual(response.status_code, 200)

    @patch("kolibri.core.device.middleware.device_provisioned")
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_unprovisioned_device_allows_content_endpoints(
        self, mock_setup_hook, mock_device_provisioned
    ):
        """
        When device is not provisioned, content endpoints should pass through.
        """
        mock_device_provisioned.return_value = False
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        for path in [
            "/content/storage/abc123.mp4",
            "/zipcontent/abc123/index.html",
            "/downloadcontent/abc123.zip",
            "/hashi/abc123/",
        ]:
            request = self._make_request(path)
            response = self.middleware(request)
            self.get_response.assert_called_with(request)
            self.assertEqual(response.status_code, 200)
            self.get_response.reset_mock()


class ProvisioningExceptionHandlerTestCase(TestCase):
    """
    Tests for ProvisioningErrorHandler.process_exception method.
    """

    def setUp(self):
        self.get_response = MagicMock()
        self.middleware = ProvisioningErrorHandler(self.get_response)

    def _make_request(self, path):
        request = MagicMock()
        request.path = path
        return request

    @patch("kolibri.core.device.middleware.redirect", side_effect=mock_redirect)
    @patch("kolibri.core.device.middleware.SetupHook")
    def test_device_not_provisioned_exception_redirects(
        self, mock_setup_hook, mock_redir
    ):
        """
        DeviceNotProvisioned exception should redirect to setup wizard.
        """
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/learn/")
        exception = DeviceNotProvisioned()

        response = self.middleware.process_exception(request, exception)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/en/setup/")

    @patch("kolibri.core.device.middleware.SetupHook")
    def test_other_exception_not_handled(self, mock_setup_hook):
        """
        Other exceptions should not be handled by this middleware.
        """
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/learn/")
        exception = ValueError("some error")

        response = self.middleware.process_exception(request, exception)

        self.assertIsNone(response)

    @patch("kolibri.core.device.middleware.SetupHook")
    def test_exception_on_setup_path_not_redirected(self, mock_setup_hook):
        """
        DeviceNotProvisioned on setup wizard path should not cause redirect loop.
        """
        mock_setup_hook.provision_url.return_value = "/en/setup/"

        request = self._make_request("/en/setup/")
        exception = DeviceNotProvisioned()

        response = self.middleware.process_exception(request, exception)

        self.assertIsNone(response)
