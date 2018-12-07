from django.conf.urls import include
from django.conf.urls import url

from .api_urls import urlpatterns
from .views import DeviceManagementView

urlpatterns = [
    url('^$', DeviceManagementView.as_view(), name='device_management'),
    url('^api/', include(urlpatterns)),
]
