from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import FacilityImportViewSet
from .api import SetupWizardRestartZeroconf

router = routers.DefaultRouter()

router.register(r"facilityimport", FacilityImportViewSet, basename="facilityimport")
router.register(
    r"restartzeroconf", SetupWizardRestartZeroconf, basename="restartzeroconf"
)

urlpatterns = [url(r"^", include(router.urls))]
