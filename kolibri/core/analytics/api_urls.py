from django.conf.urls import url

from .api import activate_requests_profiling

urlpatterns = [
    url(r'^activate/(?P<pid>[^/]+)/$', activate_requests_profiling, name='activate_requests_profiling'),
]
