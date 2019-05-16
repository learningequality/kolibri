from __future__ import print_function
from __future__ import unicode_literals

import json

from django.test import TestCase
from django.test.client import RequestFactory
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.viewsets import ModelViewSet

from kolibri.core.content.models import Language
from kolibri.core.content.serializers import LanguageSerializer
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin


class LanguageViewSet(ModelViewSet):
    filter_backends = (DjangoFilterBackend,)
    queryset = Language.objects.all()
    serializer_class = LanguageSerializer
    filter_fields = ("id",)


class BulkDeleteView(BulkDeleteMixin, LanguageViewSet):
    pass


class BulkCreateView(BulkCreateMixin, LanguageViewSet):
    pass


class TestBulkAPIMixins(TestCase):
    lang1 = {"id": "en-us", "lang_code": "en", "lang_subcode": "us"}
    lang2 = {"id": "fr-fr", "lang_code": "fr", "lang_subcode": "fr"}

    def setUp(self):
        super(TestBulkAPIMixins, self).setUp()
        self.request = RequestFactory()

    def test_get(self):
        """
        Test that GET request is successful on bulk create view.
        """
        view = BulkCreateView.as_view({"get": "list"})
        response = view(self.request.get(""))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_single(self):
        """
        Test that POST request with single resource only creates a single resource.
        """
        view = BulkCreateView.as_view({"post": "create"})
        response = view(
            self.request.post(
                "", json.dumps(self.lang1), content_type="application/json"
            )
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Language.objects.count(), 1)
        self.assertEqual(Language.objects.get().id, self.lang1["id"])

    def test_post_bulk(self):
        """
        Test that POST request with multiple resources creates all posted resources.
        """
        view = BulkCreateView.as_view({"post": "create"})
        response = view(
            self.request.post(
                "",
                json.dumps([self.lang1, self.lang2]),
                content_type="application/json",
            )
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Language.objects.count(), 2)
        self.assertEqual(
            list(Language.objects.all().values_list("id", flat=True)),
            [self.lang1["id"], self.lang2["id"]],
        )

    def test_delete_not_filtered(self):
        """
        Test that DELETE is not allowed when results are not filtered.
        """
        view = BulkDeleteView.as_view({"delete": "bulk_destroy"})
        Language.objects.create(**self.lang1)
        Language.objects.create(**self.lang2)

        response = view(self.request.delete(""))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_filtered(self):
        """
        Test that DELETE removes all filtered resources.
        """
        view = BulkDeleteView.as_view({"delete": "bulk_destroy"})
        Language.objects.create(**self.lang1)
        Language.objects.create(**self.lang2)

        response = view(self.request.delete("?id=" + self.lang1["id"]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Language.objects.count(), 1)
        self.assertEqual(Language.objects.get().id, self.lang2["id"])
