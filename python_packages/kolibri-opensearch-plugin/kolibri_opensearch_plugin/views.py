from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.views.generic import View
from kolibri.core.content.api import ContentNodeSearchViewset


class Descriptor(View):
    def get(self, request):
        """
        Gets the opensearch descriptor
        """
        absolute_url = request.build_absolute_uri()
        xml = (
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            "<OpenSearchDescription xmlns=\"http://a9.com/-/spec/opensearch/1.1/\">"
            "  <ShortName>Kolibri</ShortName>"
            "  <Description>Kolibri Open Search Engine</Description>"
            + ("  <Url type=\"application/atom+xml\" template=\"%s/opensearch/search?q={searchTerms}\"/>" % absolute_url)
            + "</OpenSearchDescription>"
        )

        return HttpResponse(xml, content_type="application/opensearchdescription+xml; charset=utf-8")


class Search(View):
    def get(self, request):
        search_set = ContentNodeSearchViewset()
        results, channel_ids, content_kinds, total_results = search_set.search("electricidad", 100, filter=False)
        xml = ""
        for result in results:
            node_link = request.build_absolute_uri(
                "{url}?node_id={id}&channel_id={channel_id}&content_id={content_id}".format(
                    url=reverse("kolibri:core:contentpermalink"),
                    id=result.id,
                    channel_id=result.channel_id,
                    content_id=result.content_id,
                )
            )
            xml += '<item><title>{result}</title><link>{link}</link></item>'.format(result=result.title, link=node_link)
        return HttpResponse(xml, content_type="application/opensearchdescription+xml; charset=utf-8")
