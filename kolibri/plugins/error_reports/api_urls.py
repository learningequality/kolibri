from django.urls import re_path

from .api import report

urlpatterns = [re_path(r"^report", report, name="report")]
