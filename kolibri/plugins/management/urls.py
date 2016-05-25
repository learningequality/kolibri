from django.conf.urls import url

from . import views

urlpatterns = [
    url('^', views.ManagementView.as_view(), name='management'),
]
