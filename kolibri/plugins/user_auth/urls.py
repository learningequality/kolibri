from django.urls import re_path

from . import views

urlpatterns = [re_path(r"^$", views.UserAuthView.as_view(), name="user_auth")]
