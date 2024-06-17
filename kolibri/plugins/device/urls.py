from django.urls import re_path

from .views import DeviceManagementView
from .views import ManageUsersView

urlpatterns = [
    re_path(r"^$", DeviceManagementView.as_view(), name="device_management"),
    re_path(r"^users$", ManageUsersView.as_view(), name="users_management"),
]
