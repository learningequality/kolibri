from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.PoliciesView.as_view(), name="policies")]
