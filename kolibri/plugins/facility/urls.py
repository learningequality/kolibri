from django.urls import re_path

from .views import FacilityManagementView

urlpatterns = [
    re_path(r"^$", FacilityManagementView.as_view(), name="facility_management")
]
