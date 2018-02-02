from django.conf.urls import url
from .views import DeviceManagementView

urlpatterns = [
    url('^$', DeviceManagementView.as_view(), name='device_management'),
]
