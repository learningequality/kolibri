from django.conf.urls import url
from mozilla_django_oidc.views import OIDCAuthenticationCallbackView
from mozilla_django_oidc.views import OIDCAuthenticationRequestView

app_name = "oidc_client"
urlpatterns = [
    url(r'^oidccallback/$', OIDCAuthenticationCallbackView.as_view(),
        name='oidc_authentication_callback'),
    url(r'^oidcauthenticate/$', OIDCAuthenticationRequestView.as_view(),
        name='oidc_authentication_init'),
]
