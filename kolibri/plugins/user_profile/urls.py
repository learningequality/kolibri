from django.urls import re_path

from . import views

urlpatterns = [re_path(r"^$", views.UserProfileView.as_view(), name="user_profile")]
