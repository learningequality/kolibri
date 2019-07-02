from django.conf.urls import url
from rest_framework import routers

from .views import ProviderInfoView

router = routers.SimpleRouter()

urlpatterns = [
    url(
        r"^\.well-known/openid-configuration/?$",
        ProviderInfoView.as_view(),
        name="provider-info",
    )
]
urlpatterns += router.urls
