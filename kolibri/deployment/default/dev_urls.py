from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.http.response import HttpResponseRedirect
from rest_framework_swagger.views import get_swagger_view

from kolibri.deployment.default.urls import urlpatterns


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        "http://127.0.0.1:3000/__open-in-editor?{query}".format(
            query=request.GET.urlencode()
        )
    )


schema_view = get_swagger_view(title="Kolibri API")

urlpatterns = urlpatterns + [
    url(r"^__open-in-editor/", webpack_redirect_view),
    url(r"^api_explorer/", schema_view),
]

if getattr(settings, "DEBUG_PANEL_ACTIVE", False):

    import debug_toolbar

    urlpatterns = [url(r"^__debug__/", include(debug_toolbar.urls))] + urlpatterns
