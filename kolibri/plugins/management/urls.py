from django.conf.urls import url
from django.views.generic.base import RedirectView

from . import views

urlpatterns = [
    url('^$', RedirectView.as_view(url='/')),
    url('^facility/$', views.ManagementView.as_view(), name='management'),
    url('^device/$', views.DeviceManagementView.as_view(), name='device_management'),
]
