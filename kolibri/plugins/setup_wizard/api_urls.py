from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import FacilityImportViewSet
from .api import SetupWizardFacilityImportTaskView

router = routers.DefaultRouter()

router.register(r"facilityimport", FacilityImportViewSet, base_name="facilityimport")
router.register(r"tasks", SetupWizardFacilityImportTaskView, base_name="tasks")

urlpatterns = [url(r"^", include(router.urls))]
