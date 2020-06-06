from rest_framework.negotiation import BaseContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.renderers import JSONRenderer


class LimitContentNegotiation(BaseContentNegotiation):
    def select_parser(self, request, parsers):
        """
        Always return JSONParser unless a 'multipart/form-data' content type is sent
        """
        if "multipart" in request.content_type:
            return MultiPartParser()
        return JSONParser()

    def select_renderer(self, request, renderers, format_suffix):
        """
        Always return JSONRenderer
        """
        renderer = JSONRenderer()
        return (renderer, renderer.media_type)
