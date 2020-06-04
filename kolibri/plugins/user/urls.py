from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.UserView.as_view(), name="user")]
