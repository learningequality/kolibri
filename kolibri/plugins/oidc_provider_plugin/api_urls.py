from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

urlpatterns = [url(r"^", include("oidc_provider.urls", namespace="oidc_provider"))]
