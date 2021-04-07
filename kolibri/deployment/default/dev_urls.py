from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.http.response import HttpResponseRedirect
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

from kolibri.deployment.default.urls import urlpatterns


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        "http://127.0.0.1:3000/__open-in-editor?{query}".format(
            query=request.GET.urlencode()
        )
    )


schema_view = get_schema_view(
    openapi.Info(
        title="Kolibri API",
        default_version="v0",
        description="Kolibri Swagger API",
        license=openapi.License(name="MIT"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = urlpatterns + [
    url(r"^__open-in-editor/", webpack_redirect_view),
    url(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    url(
        r"^api_explorer/$",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    url(
        r"^redoc/$",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc",
    ),
    url(r"^api-auth/", include("rest_framework.urls", namespace="rest_framework")),
]

if getattr(settings, "DEBUG_PANEL_ACTIVE", False):

    import debug_toolbar

    urlpatterns = [url(r"^__debug__/", include(debug_toolbar.urls))] + urlpatterns
