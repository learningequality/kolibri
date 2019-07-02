from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .views import ProviderInfoView

router = routers.SimpleRouter()

urlpatterns = [
    url(
        r"^\.well-known/openid-configuration/?$",
        ProviderInfoView.as_view(),
        name="provider-info",
    ),
    url(r"^", include("oidc_provider.urls", namespace="oidc_provider")),
]
urlpatterns += router.urls
