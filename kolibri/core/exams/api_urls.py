from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import ExamViewset

router = routers.SimpleRouter()
router.register(r"exam", ExamViewset, basename="exam")

urlpatterns = [re_path(r"^", include(router.urls))]
