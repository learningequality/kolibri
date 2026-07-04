from django.conf.urls import url

from .views import Descriptor, Search

urlpatterns = [
    url(r"^opensearch/$", Descriptor.as_view(), name="opensearch"),
    url(r"opensearch/search/$", Search.as_view(), name="opensearch_search"),
]
