from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.UserAuthView.as_view(), name="user_auth")]
