from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.views.generic import View
from feedgenerator.django.utils import feedgenerator
from kolibri.core.content.api import ContentNodeSearchViewset


class Descriptor(View):
    def get(self, request):
        """
        Gets the opensearch descriptor
        """
        absolute_url = request.build_absolute_uri()
        xml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">'
            "<ShortName>Kolibri</ShortName>"
            "<Description>Kolibri Open Search Engine</Description>"
            + ('<Url type="application/atom+xml" template="%s/opensearch/search?q={searchTerms}"/>' % absolute_url)
            + "</OpenSearchDescription>"
        )

        return HttpResponse(xml, content_type="application/opensearchdescription+xml; charset=utf-8")


class Search(View):
    def get(self, request):
        value = request.GET.get("q")
        if not value:
            return HttpResponse("The parameter 'q' is missing and is required", status=412)

        search_set = ContentNodeSearchViewset()
        results, channel_ids, content_kinds, total_results = search_set.search(value, 100, filter=False)

        feed = feedgenerator.Atom1Feed(
            title=u"Kolibri search results",
            link=request.build_absolute_uri(),
            description=u"Kolibri search results for query {value}".format(value=value),
        )

        for result in results:
            node_link = request.build_absolute_uri(
                "{url}?node_id={id}&channel_id={channel_id}&content_id={content_id}".format(
                    url=reverse("kolibri:core:contentpermalink"),
                    id=result.id,
                    channel_id=result.channel_id,
                    content_id=result.content_id,
                )
            )
            feed.add_item(result.title, node_link, result.description)

        res = feed.writeString('utf-8')

        return HttpResponse(res, content_type="application/atom+xml; charset=utf-8")
