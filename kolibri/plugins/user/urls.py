from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^sanitized_users", views.sanitized_facility_users, name="sanitized_users"),
    url(r"^$", views.UserView.as_view(), name="user"),
]
