from typing import ClassVar
from unittest.mock import patch

from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase
from rest_framework.views import APIView


class EchoView(APIView):
    authentication_classes: ClassVar[list] = []
    permission_classes: ClassVar[list] = []

    def post(self, request):
        return Response(request.data)


class JSONParserTestCase(APITestCase):
    def post(self, body):
        request = APIRequestFactory().post(
            "/", data=body, content_type="application/json"
        )
        return EchoView.as_view()(request)

    def test_parses_json_body(self):
        response = self.post('{"a": [1]}')
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data, {"a": [1]})

    # Whether the C JSON scanner raises RecursionError for a given depth
    # depends on the thread stack size on Python 3.14+, so it is forced here.
    @patch("rest_framework.parsers.json.load", side_effect=RecursionError)
    def test_deeply_nested_body_is_a_bad_request(self, mock_load):
        response = self.post("[]")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
