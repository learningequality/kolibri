from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.MyDownloadsView.as_view(), name="my_downloads")]
