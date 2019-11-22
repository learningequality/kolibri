from rest_framework.negotiation import BaseContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer


class JSONOnlyContentNegotiation(BaseContentNegotiation):
    def select_parser(self, request, parsers):
        """
        Always return JSONParser
        """
        return JSONParser()

    def select_renderer(self, request, renderers, format_suffix):
        """
        Always return JSONRenderer
        """
        renderer = JSONRenderer()
        return (renderer, renderer.media_type)
