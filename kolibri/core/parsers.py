from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser as BaseJSONParser


class JSONParser(BaseJSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        # json.loads raises RecursionError, not ValueError, for deeply nested
        # input, which DRF's parser does not turn into a ParseError.
        try:
            return super().parse(stream, media_type, parser_context)
        except RecursionError:
            raise ParseError("JSON parse error - nested too deeply") from None
