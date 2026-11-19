from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase
from django.test.client import RequestFactory
from rest_framework import serializers

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.test.test_app.models import Author
from kolibri.core.utils.pagination import ValuesViewsetCursorPagination
from kolibri.core.utils.pagination import ValuesViewsetLimitOffsetPagination
from kolibri.core.utils.pagination import ValuesViewsetPageNumberPagination
from kolibri.core.utils.test.helpers import encode_cursor


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ("id", "name")


class PageNumberPagination(ValuesViewsetPageNumberPagination):
    page_size = 2
    page_size_query_param = "page_size"
    max_page_size = 5


class LimitOffsetPagination(ValuesViewsetLimitOffsetPagination):
    default_limit = 2
    max_limit = 5


def author_viewset(pagination):
    class AuthorViewSet(ReadOnlyValuesViewset):
        serializer_class = AuthorSerializer
        queryset = Author.objects.order_by("name")
        pagination_class = pagination

    return AuthorViewSet.as_view({"get": "list"})


PAGINATIONS = (
    (PageNumberPagination, "page_size"),
    (LimitOffsetPagination, "limit"),
)


class MaximumPageSizeTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        for i in range(8):
            Author.objects.create(name=f"author{i}")

    def _list(self, pagination, params):
        return author_viewset(pagination)(RequestFactory().get("", params))

    def test_page_size_above_subclass_maximum_returns_400(self):
        for pagination, param in PAGINATIONS:
            with self.subTest(param=param):
                response = self._list(pagination, {param: 6})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data[0]["metadata"]["field"], param)

    def test_page_size_at_subclass_maximum_returns_that_many(self):
        for pagination, param in PAGINATIONS:
            with self.subTest(param=param):
                response = self._list(pagination, {param: 5})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.data["results"]), 5)

    def test_malformed_page_size_returns_400(self):
        for pagination, param in PAGINATIONS:
            for value in ("0", "abc"):
                with self.subTest(param=param, value=value):
                    response = self._list(pagination, {param: value})
                    self.assertEqual(response.status_code, 400)
                    self.assertEqual(response.data[0]["metadata"]["field"], param)


class ActiveCursorPagination(ValuesViewsetCursorPagination):
    page_size = 2
    ordering = ("is_active",)


class PublisherCursorPagination(ValuesViewsetCursorPagination):
    page_size = 2
    ordering = ("publisher",)


class NameCursorPagination(ValuesViewsetCursorPagination):
    page_size = 1
    ordering = ("name",)


class CursorPositionTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        Author.objects.create(name="active")
        Author.objects.create(name="inactive", is_active=False)

    def _list(self, pagination, position):
        return author_viewset(pagination)(
            RequestFactory().get("", {"cursor": encode_cursor(p=position)})
        )

    def test_unmapped_ordering_field_raises_without_cursor(self):
        with self.assertRaises(ImproperlyConfigured):
            author_viewset(PublisherCursorPagination)(RequestFactory().get(""))

    def test_mapped_ordering_field_accepts_valid_position(self):
        response = self._list(ActiveCursorPagination, "false")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)

    def test_mapped_ordering_field_rejects_invalid_position(self):
        response = self._list(ActiveCursorPagination, "abc")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["metadata"]["field"], "cursor")

    def test_text_ordering_follows_more_across_blank_and_padded_positions(self):
        for name in ("", " b", "c"):
            Author.objects.create(name=name)
        expected_ids = set(Author.objects.values_list("id", flat=True))
        view = author_viewset(NameCursorPagination)
        response = view(RequestFactory().get(""))
        seen_ids = []
        for _ in range(len(expected_ids)):
            self.assertEqual(response.status_code, 200)
            seen_ids.extend(author["id"] for author in response.data["results"])
            if response.data["more"] is None:
                break
            response = view(RequestFactory().get("", response.data["more"]))
        self.assertIsNone(response.data["more"])
        self.assertEqual(len(seen_ids), len(set(seen_ids)))
        self.assertSetEqual(set(seen_ids), expected_ids)
