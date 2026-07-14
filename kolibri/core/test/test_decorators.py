import gzip
from unittest import mock

from django.http import HttpResponse
from django.template import engines
from django.template.response import TemplateResponse
from django.test import RequestFactory
from django.test import SimpleTestCase
from django.views.generic.base import View

from kolibri.core.decorators import _CachedBody
from kolibri.core.decorators import BODY_CACHE_REFRESH
from kolibri.core.decorators import cache_no_user_data
from kolibri.core.decorators import InvalidQueryParamsException
from kolibri.core.decorators import ParamValidator
from kolibri.core.utils.cache import process_cache


def run_inline(target):
    target()


class ParamValidatorTestCase(SimpleTestCase):
    def test_eq_constraint_message_says_equal_to(self):
        validator = ParamValidator("count")
        validator.set_type(int)
        validator.eq = 5

        with self.assertRaises(InvalidQueryParamsException) as ctx:
            validator.check_value_constraints(7)

        self.assertIn("must be equal to 5", str(ctx.exception))

    def test_invalid_bool_param_raises_query_params_exception(self):
        validator = ParamValidator("flag")
        validator.set_type(bool)

        with self.assertRaises(InvalidQueryParamsException):
            validator.check_non_tuple_types("yes")


class CacheNoUserDataTestCase(SimpleTestCase):
    def setUp(self):
        process_cache.clear()
        self.factory = RequestFactory()

    def _request(self, path="/en/learn/", **extra):
        request = self.factory.get(path, **extra)
        request.session = {}
        return request

    def _view(self):
        # Each render returns a distinct body, so a stale read is distinguishable
        # from a fresh one.
        render_count = []

        @cache_no_user_data
        class CachedView(View):
            def dispatch(self, request, *args, **kwargs):
                render_count.append(1)
                return HttpResponse("body-{}".format(len(render_count)))

        return CachedView().dispatch, render_count

    def _template_view(self):
        # The real cached views all return an unrendered TemplateResponse.
        @cache_no_user_data
        class CachedTemplateView(View):
            def dispatch(self, request, *args, **kwargs):
                return TemplateResponse(
                    request, engines["django"].from_string("body-{{ n }}"), {"n": 1}
                )

        return CachedTemplateView().dispatch

    def test_renders_once_then_serves_the_shared_body(self):
        view, render_count = self._view()

        first = view(self._request())
        second = view(self._request())

        self.assertEqual(gzip.decompress(first.content), b"body-1")
        self.assertEqual(gzip.decompress(second.content), b"body-1")
        self.assertEqual(second["Vary"], "Accept-Encoding")
        self.assertEqual(len(render_count), 1)

        # A different path is cached separately.
        view(self._request("/en/coach/"))
        self.assertEqual(len(render_count), 2)

    def test_serves_stale_body_while_refreshing_in_background(self):
        view, render_count = self._view()
        base = 1000.0
        stale = base + BODY_CACHE_REFRESH + 100  # well past the refresh deadline

        with mock.patch("kolibri.core.decorators._spawn", run_inline):
            with mock.patch("kolibri.core.decorators.time.time", return_value=base):
                view(self._request())  # caches body-1
            with mock.patch("kolibri.core.decorators.time.time", return_value=stale):
                served = view(self._request())
            with mock.patch(
                "kolibri.core.decorators.time.time", return_value=stale + 1
            ):
                after = view(self._request())

        # Entry never hard-expires: stale is served past the deadline, then replaced.
        self.assertEqual(gzip.decompress(served.content), b"body-1")
        self.assertEqual(gzip.decompress(after.content), b"body-2")
        self.assertEqual(len(render_count), 2)

    def test_refresh_deadline_is_jittered_back_from_the_full_window(self):
        view, _ = self._view()

        with mock.patch("kolibri.core.decorators.time.time", return_value=1000.0):
            with mock.patch("kolibri.core.decorators.random.uniform", return_value=2.0):
                view(self._request())

        # Bodies stored in one burst must not all come due in the same instant.
        _, refresh_at = process_cache.get(_CachedBody._keys("/en/learn/")[0])
        self.assertEqual(refresh_at, 1000.0 + BODY_CACHE_REFRESH - 2.0)

    def test_serves_304_to_a_client_that_already_has_the_body(self):
        view, render_count = self._view()

        first = view(self._request())
        etag = first["ETag"]
        conditional = view(self._request(HTTP_IF_NONE_MATCH=etag))

        # Client already holds the body: revalidate to 304, no re-fetch, no re-render.
        self.assertEqual(conditional.status_code, 304)
        self.assertFalse(conditional.content)
        self.assertEqual(len(render_count), 1)

    def test_stores_and_serves_a_gzipped_body(self):
        view, _ = self._view()

        response = view(self._request())

        self.assertEqual(response["Content-Encoding"], "gzip")
        self.assertEqual(response["Content-Length"], str(len(response.content)))
        self.assertEqual(gzip.decompress(response.content), b"body-1")

    def test_serves_the_plain_body_to_a_client_that_does_not_accept_gzip(self):
        view, render_count = self._view()

        view(self._request())
        response = view(self._request(HTTP_ACCEPT_ENCODING="identity"))

        # Both encodings come from one stored render, as for static assets.
        self.assertFalse(response.has_header("Content-Encoding"))
        self.assertEqual(response.content, b"body-1")
        self.assertEqual(response["Content-Length"], str(len(b"body-1")))
        self.assertEqual(len(render_count), 1)

    def test_each_encoding_gets_its_own_etag(self):
        view, _ = self._view()

        gzipped = view(self._request())
        plain = view(self._request(HTTP_ACCEPT_ENCODING="identity"))

        # Distinct representations must not share an ETag, or a conditional GET
        # would 304 a client holding the other encoding.
        self.assertNotEqual(gzipped["ETag"], plain["ETag"])
        self.assertEqual(gzipped["Vary"], "Accept-Encoding")
        self.assertEqual(plain["Vary"], "Accept-Encoding")

    def test_renders_and_stores_both_encodings_of_a_template_response(self):
        view = self._template_view()

        gzipped = view(self._request())
        plain = view(self._request(HTTP_ACCEPT_ENCODING="identity"))

        # An unrendered TemplateResponse must survive rendering, copying for the
        # second encoding, and the round trip through the cache.
        self.assertEqual(gzip.decompress(gzipped.content), b"body-1")
        self.assertEqual(plain.content, b"body-1")
        self.assertNotEqual(gzipped["ETag"], plain["ETag"])

    def test_conditional_get_matches_only_the_encoding_the_client_holds(self):
        view, _ = self._view()

        plain_etag = view(self._request(HTTP_ACCEPT_ENCODING="identity"))["ETag"]
        revalidated = view(
            self._request(
                HTTP_ACCEPT_ENCODING="identity", HTTP_IF_NONE_MATCH=plain_etag
            )
        )
        crossed = view(self._request(HTTP_IF_NONE_MATCH=plain_etag))

        self.assertEqual(revalidated.status_code, 304)
        # A gzip client holding the plain ETag must get the body, not a 304.
        self.assertEqual(crossed.status_code, 200)
        self.assertEqual(gzip.decompress(crossed.content), b"body-1")
