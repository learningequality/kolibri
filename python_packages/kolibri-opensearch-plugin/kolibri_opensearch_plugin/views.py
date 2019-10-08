from django.views.generic import View
from django.http import HttpResponse


class Descriptor(View):

    def get(self, request):
        """
        Gets the opensearch descriptor
        """
        absolute_url = request.build_absolute_uri()
        xml = ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
               "<OpenSearchDescription xmlns=\"http://a9.com/-/spec/opensearch/1.1/\">"
               "  <ShortName>Kolibri</ShortName>"
               "  <Description>Kolibri Open Search Engine</Description>" +
               ("  <Url type=\"application/atom+xml\" template=\"%s/search?q={searchTerms}\"/>" % absolute_url) +
               "</OpenSearchDescription>"
               )

        return HttpResponse(xml, content_type="application/opensearchdescription+xml; charset=utf-8")

