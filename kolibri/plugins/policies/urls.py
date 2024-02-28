from django.urls import re_path

from . import views

urlpatterns = [re_path(r"^$", views.PoliciesView.as_view(), name="policies")]
