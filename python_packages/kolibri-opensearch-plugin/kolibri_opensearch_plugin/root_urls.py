from django.conf.urls import url

from .views import Descriptor

urlpatterns = [
    url(r'^opensearch/$', Descriptor.as_view(), name='opensearch'),
]