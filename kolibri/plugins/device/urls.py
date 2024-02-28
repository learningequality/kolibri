from django.urls import re_path

from .views import DeviceManagementView

urlpatterns = [re_path(r"^$", DeviceManagementView.as_view(), name="device_management")]
