from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.UserProfileView.as_view(), name="user_profile")]
