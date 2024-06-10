from django.urls import re_path

from .api import frontendreport

urlpatterns = [re_path(r"^frontendreport", frontendreport, name="frontendreport")]
