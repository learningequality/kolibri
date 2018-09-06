import api_urls
from django.conf.urls import include
from django.conf.urls import url

from .views import DeviceManagementView

urlpatterns = [
    url('^$', DeviceManagementView.as_view(), name='device_management'),
    url('^api/', include(api_urls.urlpatterns)),
]
