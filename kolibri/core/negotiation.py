from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.renderers import JSONRenderer


class LimitContentNegotiation(DefaultContentNegotiation):
    def select_parser(self, request, parsers):
        """
        Always return JSONParser unless a 'multipart/form-data' content type is sent
        or this is for morango
        """

        if request.path.startswith("/api/morango"):
            return super(LimitContentNegotiation, self).select_parser(request, parsers)
        if "multipart" in request.content_type:
            return MultiPartParser()
        return JSONParser()

    def select_renderer(self, request, renderers, format_suffix=None):
        """
        Always return JSONRenderer unless for morango
        """
        if request.path.startswith("/api/morango"):
            return super(LimitContentNegotiation, self).select_renderer(
                request, renderers, format_suffix=None
            )
        renderer = JSONRenderer()
        return (renderer, renderer.media_type)
