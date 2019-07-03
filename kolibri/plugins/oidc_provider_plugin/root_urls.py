from django.conf.urls import include
from django.conf.urls import url
from django.views.decorators.csrf import csrf_exempt
from oidc_provider import views

# Copied and modified from:
# https://github.com/juanifioren/django-oidc-provider/blob/master/oidc_provider/urls.py
# to reduce top level URL clutter, while maintaining oidc_provider URL namespacing
# for Django URL reversal.


app_name = "oidc_provider"
subpatterns = [
    url(r"authorize/?$", views.AuthorizeView.as_view(), name="authorize"),
    url(r"token/?$", csrf_exempt(views.TokenView.as_view()), name="token"),
    url(r"userinfo/?$", csrf_exempt(views.userinfo), name="userinfo"),
    url(r"end-session/?$", views.EndSessionView.as_view(), name="end-session"),
    url(
        r"introspect/?$",
        views.TokenIntrospectionView.as_view(),
        name="token-introspection",
    ),
    url(r"jwks/?$", views.JwksView.as_view(), name="jwks"),
]


urlpatterns = [
    url(r"^oidc_provider/", include(subpatterns)),
    url(
        r"^\.well-known/openid-configuration/?$",
        views.ProviderInfoView.as_view(),
        name="provider-info",
    ),
]
