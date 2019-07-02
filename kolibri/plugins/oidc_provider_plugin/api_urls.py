from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

router = routers.SimpleRouter()

urlpatterns = [url(r"^", include("oidc_provider.urls", namespace="oidc_provider"))]
urlpatterns += router.urls
