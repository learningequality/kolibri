from django.conf.urls import url

from . import views

urlpatterns = [
    url('^facility$', views.ManagementView.as_view(), name='management'),
    url('^device$', views.DeviceManagementView.as_view(), name='device_management'),
]
