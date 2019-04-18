from django.conf.urls import url

from .views import FacilityManagementView

urlpatterns = [url(r"^$", FacilityManagementView.as_view(), name="facility_management")]
