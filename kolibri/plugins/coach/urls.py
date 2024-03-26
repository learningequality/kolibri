from django.urls import re_path

from . import views

urlpatterns = [re_path(r"^$", views.CoachView.as_view(), name="coach")]
