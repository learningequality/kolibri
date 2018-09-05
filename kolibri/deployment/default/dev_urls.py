from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from rest_framework.documentation import include_docs_urls

from kolibri.deployment.default.urls import urlpatterns
from kolibri.utils.api import Generator

urlpatterns = urlpatterns + [
    url(r'^docs/', include_docs_urls(title='Kolibri API', generator_class=Generator))
]

if getattr(settings, 'DEBUG_PANEL_ACTIVE', False):

    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns

if getattr(settings, 'REST_SWAGGER', False):
    from rest_framework_swagger.views import get_swagger_view

    schema_view = get_swagger_view(title='Kolibri API')

    urlpatterns += [
        url(r'^api_explorer/', schema_view)
    ]

if getattr(settings, 'REDIRECT_WEBPACK', False):
    from django.http.response import HttpResponseRedirect

    def webpack_redirect_view(request):
        return HttpResponseRedirect('http://127.0.0.1:3000/__open-in-editor?{query}'.format(query=request.GET.urlencode()))

    urlpatterns += [
        url(r'^__open-in-editor/', webpack_redirect_view)
    ]
